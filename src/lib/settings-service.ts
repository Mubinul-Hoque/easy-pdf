import { query } from './db';
import fs from 'fs';
import path from 'path';
import { SiteSettings, DEFAULT_SETTINGS } from './settings-types';

export { DEFAULT_SETTINGS };
export type { SiteSettings };

// Global singleton cache in memory for zero-latency lookups
declare global {
  var __easypdf_site_settings: SiteSettings | undefined;
}

let cachedSettings: SiteSettings =
  globalThis.__easypdf_site_settings || { ...DEFAULT_SETTINGS };

if (process.env.NODE_ENV !== 'production') {
  globalThis.__easypdf_site_settings = cachedSettings;
}

const ALLOWED_BRANDING_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.ico']);

/**
 * Validate that a buffer's magic bytes match the claimed image extension.
 * Prevents disguising arbitrary content (e.g. HTML/JS) behind an image extension.
 */
function isValidImageBuffer(buffer: Buffer, ext: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  switch (ext) {
    case '.png':
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    case '.jpg':
    case '.jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case '.webp':
      return (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    case '.ico':
      // ICO header: 00 00 01 00
      return buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00;
    default:
      return false;
  }
}

let settingsTableEnsured = false;
export async function ensureSettingsTable(): Promise<void> {
  if (settingsTableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    settingsTableEnsured = true;
  } catch (err: any) {
    // Database offline, resilient memory fallback active
  }
}

export const settingsService = {
  /**
   * Retrieves current site settings (from DB with memory fallback)
   */
  async getSettings(): Promise<SiteSettings> {
    try {
      await ensureSettingsTable();
      const rows = await query<{ setting_key: string; setting_value: string }>(
        `SELECT setting_key, setting_value FROM system_settings`
      );

      if (rows && rows.length > 0) {
        const dbMap: Record<string, string> = {};
        for (const row of rows) {
          dbMap[row.setting_key] = row.setting_value;
        }

        const merged: SiteSettings = {
          appName: dbMap.appName || DEFAULT_SETTINGS.appName,
          appTagline: dbMap.appTagline || DEFAULT_SETTINGS.appTagline,
          logoUrl: dbMap.logoUrl !== undefined ? dbMap.logoUrl : DEFAULT_SETTINGS.logoUrl,
          faviconUrl: dbMap.faviconUrl !== undefined ? dbMap.faviconUrl : DEFAULT_SETTINGS.faviconUrl,
          primaryColor: dbMap.primaryColor || DEFAULT_SETTINGS.primaryColor,
          headerBadgeText: dbMap.headerBadgeText || DEFAULT_SETTINGS.headerBadgeText,
          contactEmail: dbMap.contactEmail || DEFAULT_SETTINGS.contactEmail,
          metaTitle: dbMap.metaTitle || DEFAULT_SETTINGS.metaTitle,
          metaDescription: dbMap.metaDescription || DEFAULT_SETTINGS.metaDescription,
          copyrightText: dbMap.copyrightText || DEFAULT_SETTINGS.copyrightText,
          maintenanceMode: dbMap.maintenanceMode === 'true',
          defaultRetentionPolicy:
            (dbMap.defaultRetentionPolicy as SiteSettings['defaultRetentionPolicy']) ||
            DEFAULT_SETTINGS.defaultRetentionPolicy,
          autoPurgeEnabled:
            dbMap.autoPurgeEnabled !== undefined ? dbMap.autoPurgeEnabled === 'true' : DEFAULT_SETTINGS.autoPurgeEnabled,
          updatedAt: dbMap.updatedAt || new Date().toISOString(),
        };

        cachedSettings = merged;
        if (process.env.NODE_ENV !== 'production') {
          globalThis.__easypdf_site_settings = cachedSettings;
        }
        return merged;
      }
    } catch {
      // Return cached/defaults
    }

    return cachedSettings;
  },

  /**
   * Updates site settings in DB and invalidates cache
   */
  async updateSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = await this.getSettings();
    const updated: SiteSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      await ensureSettingsTable();

      const entries = Object.entries(updated);
      for (const [key, val] of entries) {
        const strVal = typeof val === 'boolean' ? String(val) : String(val ?? '');
        await query(
          `INSERT INTO system_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
          [key, strVal]
        );
      }
    } catch (err: any) {
      console.warn('[Settings DB Notice] Storing settings in memory:', err.message);
    }

    cachedSettings = updated;
    if (process.env.NODE_ENV !== 'production') {
      globalThis.__easypdf_site_settings = cachedSettings;
    }

    return updated;
  },

  /**
   * Saves uploaded branding file (Logo or Favicon) to public/uploads/branding/
   *
   * Only a fixed set of image extensions is accepted, and the file's magic
   * bytes must match — this is a publicly-served directory, so accepting an
   * arbitrary extension (.html, .svg, .js, ...) would let an authenticated
   * admin host arbitrary content/script from the app's own origin.
   */
  async saveBrandingFile(
    fileBuffer: Buffer,
    originalName: string,
    type: 'logo' | 'favicon'
  ): Promise<string> {
    const requestedExt = path.extname(originalName).toLowerCase();
    const ext = ALLOWED_BRANDING_EXTENSIONS.has(requestedExt)
      ? requestedExt
      : type === 'favicon'
      ? '.ico'
      : '.png';

    if (!isValidImageBuffer(fileBuffer, ext)) {
      throw new Error('Uploaded file is not a valid image of the expected type.');
    }

    const fileName = `${type}_${Date.now()}${ext}`;

    const brandingDir = path.join(process.cwd(), 'public', 'uploads', 'branding');
    if (!fs.existsSync(brandingDir)) {
      fs.mkdirSync(brandingDir, { recursive: true });
    }

    const targetPath = path.join(brandingDir, fileName);
    fs.writeFileSync(targetPath, fileBuffer);

    return `/uploads/branding/${fileName}`;
  },
};

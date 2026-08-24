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
   */
  async saveBrandingFile(
    fileBuffer: Buffer,
    originalName: string,
    type: 'logo' | 'favicon'
  ): Promise<string> {
    const ext = path.extname(originalName).toLowerCase() || (type === 'favicon' ? '.ico' : '.png');
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

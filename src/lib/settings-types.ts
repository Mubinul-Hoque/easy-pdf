export type RetentionPolicy = '15_mins' | '1_hour' | '24_hours';

export interface SiteSettings {
  appName: string;
  appTagline: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  headerBadgeText: string;
  contactEmail: string;
  metaTitle: string;
  metaDescription: string;
  copyrightText: string;
  maintenanceMode: boolean;
  // Default retention window applied to anonymous/guest processing jobs
  // (authenticated users still get their plan's own retention window).
  defaultRetentionPolicy: RetentionPolicy;
  autoPurgeEnabled: boolean;
  // Whether the Email / Phone tabs are offered at all on registration & login.
  // Turning a channel off hides it from the UI and rejects OTP requests for it,
  // independent of whether its delivery provider (Resend/Twilio) is configured.
  emailVerificationEnabled: boolean;
  phoneVerificationEnabled: boolean;
  updatedAt?: string;
}

export const RETENTION_POLICY_HOURS: Record<RetentionPolicy, number> = {
  '15_mins': 0.25,
  '1_hour': 1,
  '24_hours': 24,
};

export const DEFAULT_SETTINGS: SiteSettings = {
  appName: 'EasyPDF',
  appTagline: 'Enterprise Online PDF Suite & Document Tools',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#4f46e5',
  headerBadgeText: 'PRO',
  contactEmail: 'support@easypdf.io',
  metaTitle: 'EasyPDF — Enterprise Online PDF Suite & Document Tools',
  metaDescription:
    'All-in-one PDF platform. Merge, split, organize, rotate, compress, repair, and OCR PDF documents with instant speed and strict zero-retention privacy.',
  copyrightText: `© ${new Date().getFullYear()} EasyPDF Platform Inc. All rights reserved.`,
  maintenanceMode: false,
  defaultRetentionPolicy: '1_hour',
  autoPurgeEnabled: true,
  emailVerificationEnabled: true,
  phoneVerificationEnabled: true,
};

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
  updatedAt?: string;
}

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
};

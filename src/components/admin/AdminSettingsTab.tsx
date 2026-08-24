'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Globe,
  Sliders,
  Trash2,
  Mail,
  Palette,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import { SiteSettings, DEFAULT_SETTINGS } from '@/lib/settings-types';
import { useSettings } from '@/context/SettingsContext';

interface AdminSettingsTabProps {
  token?: string;
  onNotification?: (msg: string) => void;
}

const COLOR_PRESETS = [
  { name: 'Indigo Brand', hex: '#4f46e5' },
  { name: 'Royal Violet', hex: '#7c3aed' },
  { name: 'Ocean Blue', hex: '#2563eb' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Rose Red', hex: '#e11d48' },
  { name: 'Amber Gold', hex: '#d97706' },
  { name: 'Slate Dark', hex: '#334155' },
];

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  token,
  onNotification,
}) => {
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Fetch Settings on Mount
  const fetchSettings = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Handle Form Field Change
  const handleChange = (field: keyof SiteSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle Save Settings
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setStatusMsg(null);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setStatusMsg({ type: 'success', text: 'Branding and general settings saved successfully!' });
        await refreshSettings();
        if (onNotification) onNotification('General settings saved & synced across website.');
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to save settings.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Network error saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  // Handle File Upload (Logo / Favicon)
  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    try {
      if (type === 'logo') setUploadingLogo(true);
      else setUploadingFavicon(true);
      setStatusMsg(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await fetch('/api/admin/settings/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        if (type === 'logo') {
          handleChange('logoUrl', data.url);
        } else {
          handleChange('faviconUrl', data.url);
        }
        if (data.settings) {
          setSettings(data.settings);
        }
        setStatusMsg({
          type: 'success',
          text: `${type === 'logo' ? 'App Logo' : 'Favicon'} uploaded and updated!`,
        });
        await refreshSettings();
        if (onNotification) onNotification(`${type === 'logo' ? 'Logo' : 'Favicon'} updated successfully!`);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Upload failed.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error uploading image.' });
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else setUploadingFavicon(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-600">Loading General Settings & Branding...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-5xl">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-600" />
            General Branding & App Customization
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Customize the application logo, browser favicon, site title, theme colors, and public contact information.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-all disabled:opacity-50 cursor-pointer"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving Changes...' : 'Save All Settings'}
        </button>
      </div>

      {/* Status Feedback Banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 animate-in fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{statusMsg.text}</span>
        </div>
      )}

      {/* SECTION 1: LOGO & FAVICON STUDIO */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">App Logo & Favicon Studio</h3>
            <p className="text-xs text-slate-500">Upload your brand marks or link external image URLs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Application Logo
              </label>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                PNG, SVG, JPG, WebP
              </span>
            </div>

            {/* Logo Preview Box */}
            <div className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 relative group overflow-hidden">
              {settings.logoUrl ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.logoUrl}
                    alt="App Logo Preview"
                    className="max-h-16 max-w-full object-contain"
                  />
                  <span className="text-[11px] text-slate-500 font-mono truncate max-w-[220px]">
                    {settings.logoUrl}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-slate-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-base font-black text-slate-900">
                      {settings.appName || 'EasyPDF'}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-medium">Default Vector Icon</span>
                  </div>
                </div>
              )}
            </div>

            {/* Upload / URL Controls */}
            <div className="space-y-3">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0], 'logo');
                  }
                }}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo File'}
                </button>

                {settings.logoUrl && (
                  <button
                    type="button"
                    onClick={() => handleChange('logoUrl', '')}
                    className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Remove custom logo (revert to default icon)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Or Direct Image URL:</label>
                <input
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={settings.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* Favicon Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Browser Favicon (.ico / .png)
              </label>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                16x16, 32x32, 64x64
              </span>
            </div>

            {/* Simulated Browser Tab Preview */}
            <div className="flex items-center justify-center h-32 rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 rounded-t-xl bg-slate-100 border border-slate-200 px-4 py-2 shadow-xs">
                {settings.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.faviconUrl}
                    alt="Favicon"
                    className="h-4 w-4 object-contain rounded-xs"
                  />
                ) : (
                  <Globe className="h-4 w-4 text-indigo-600" />
                )}
                <span className="text-xs font-semibold text-slate-700 max-w-[140px] truncate">
                  {settings.appName || 'EasyPDF'} — Web Tab
                </span>
              </div>
            </div>

            {/* Upload / URL Controls */}
            <div className="space-y-3">
              <input
                ref={faviconInputRef}
                type="file"
                accept=".ico,.png,.svg,.jpg,.webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0], 'favicon');
                  }
                }}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => faviconInputRef.current?.click()}
                  disabled={uploadingFavicon}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingFavicon ? 'Uploading...' : 'Upload Favicon File'}
                </button>

                {settings.faviconUrl && (
                  <button
                    type="button"
                    onClick={() => handleChange('faviconUrl', '')}
                    className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Remove custom favicon"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Or Direct Favicon URL:</label>
                <input
                  type="text"
                  placeholder="/favicon.ico or https://..."
                  value={settings.faviconUrl}
                  onChange={(e) => handleChange('faviconUrl', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: BRAND IDENTITY & APPEARANCE */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Brand Identity & Accent Theme</h3>
            <p className="text-xs text-slate-500">Define the website title, slogan, and primary color palette</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* App Name */}
          <div>
            <label className="text-xs font-bold text-slate-700">App / Site Name</label>
            <input
              type="text"
              required
              value={settings.appName}
              onChange={(e) => handleChange('appName', e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Header Badge Text */}
          <div>
            <label className="text-xs font-bold text-slate-700">Navbar Badge Text</label>
            <input
              type="text"
              value={settings.headerBadgeText}
              onChange={(e) => handleChange('headerBadgeText', e.target.value)}
              placeholder="e.g. PRO, BETA, VIP"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Support Email */}
          <div>
            <label className="text-xs font-bold text-slate-700">Support / Contact Email</label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={settings.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                placeholder="support@easypdf.io"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div>
          <label className="text-xs font-bold text-slate-700">App Tagline / Headline</label>
          <input
            type="text"
            value={settings.appTagline}
            onChange={(e) => handleChange('appTagline', e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Theme Accent Palettes */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">
            Primary Accent Theme Color
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {COLOR_PRESETS.map((preset) => {
              const isSelected = settings.primaryColor.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => handleChange('primaryColor', preset.hex)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm scale-105'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span>{preset.name}</span>
                </button>
              );
            })}

            {/* Custom Hex Input */}
            <div className="flex items-center gap-1.5 ml-2">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
                className="h-8 w-8 rounded-lg cursor-pointer border border-slate-200 p-0.5"
              />
              <span className="font-mono text-xs font-bold text-slate-700">
                {settings.primaryColor}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: SEO & METADATA */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">SEO & Metadata Configuration</h3>
            <p className="text-xs text-slate-500">Configure public search engine tags and social sharing metadata</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700">Default Meta Title</label>
            <input
              type="text"
              value={settings.metaTitle}
              onChange={(e) => handleChange('metaTitle', e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Default Meta Description</label>
            <textarea
              rows={3}
              value={settings.metaDescription}
              onChange={(e) => handleChange('metaDescription', e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: FOOTER COPYRIGHT & MAINTENANCE */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Footer Notice & Maintenance Mode</h3>
            <p className="text-xs text-slate-500">Manage legal attribution and site operational status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-bold text-slate-700">Footer Copyright Notice</label>
            <input
              type="text"
              value={settings.copyrightText}
              onChange={(e) => handleChange('copyrightText', e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Maintenance Mode</span>
              <span className="text-[11px] text-slate-500">Display maintenance banner to non-admin visitors</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={fetchSettings}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Reset Unsaved
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-all disabled:opacity-50 cursor-pointer"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </form>
  );
};

export default AdminSettingsTab;

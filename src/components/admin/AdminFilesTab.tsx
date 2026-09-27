'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
} from 'lucide-react';
import type { AdminStats } from '@/lib/admin-service';
import type { SiteSettings, RetentionPolicy } from '@/lib/settings-types';

interface AdminFilesTabProps {
  stats: AdminStats | null;
  onPurgeStorage: () => void;
  isPurging: boolean;
  token?: string;
  onNotification?: (msg: string) => void;
}

export const AdminFilesTab: React.FC<AdminFilesTabProps> = ({
  stats,
  onPurgeStorage,
  isPurging,
  token,
  onNotification,
}) => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [lastCleanupRunAt, setLastCleanupRunAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, healthRes] = await Promise.all([
        fetch('/api/admin/settings', { headers: authHeaders }),
        fetch('/api/admin/system', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ action: 'health_check' }),
        }),
      ]);
      const settingsData = await settingsRes.json();
      if (settingsData.success) setSettings(settingsData.settings);

      const healthData = await healthRes.json();
      if (healthData.success) setLastCleanupRunAt(healthData.lastCleanupRunAt || null);
    } catch (err) {
      console.error(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatRelativeTime = (iso: string | null) => {
    if (!iso) return 'Never run yet';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          defaultRetentionPolicy: settings.defaultRetentionPolicy,
          autoPurgeEnabled: settings.autoPurgeEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        if (onNotification) onNotification('File retention policy saved.');
      }
    } catch (err: any) {
      alert('Failed to save retention settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. RETENTION BANNER */}
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Strict Zero-Retention Architecture Active</h3>
              <p className="text-xs text-slate-500 max-w-lg">
                Uploaded and converted files are ephemeral. Artifacts are automatically scrubbed from memory & storage immediately upon user download or expiration.
              </p>
            </div>
          </div>

          <button
            onClick={onPurgeStorage}
            disabled={isPurging}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-500/20 hover:bg-rose-700 transition-all disabled:opacity-50"
          >
            <Trash2 className={`h-4 w-4 ${isPurging ? 'animate-bounce' : ''}`} />
            {isPurging ? 'Purging Storage...' : 'Force Purge All Files Now'}
          </button>
        </div>
      </div>

      {/* 2. STORAGE TELEMETRY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Temp Footprint</span>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatBytes(stats?.currentTempStorageBytes || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Temporary memory buffers pending cleanup</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lifetime Auto-Purged</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {formatBytes(stats?.totalStoragePurgedBytes || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {(stats?.purgedFilesCount || 0).toLocaleString()} artifacts safely incinerated
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Automatic Cleanup Cron</span>
          <p className="text-lg font-black text-indigo-600 mt-2">{formatRelativeTime(lastCleanupRunAt)}</p>
          <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${lastCleanupRunAt ? 'text-emerald-600' : 'text-amber-600'}`}>
            {lastCleanupRunAt ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Last run via /api/files/cleanup/expired
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5" /> No cleanup run recorded yet — verify the cron trigger
              </>
            )}
          </p>
        </div>
      </div>

      {/* 3. RETENTION POLICY & CONFIGURATION */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">File Retention Policies</h3>
            <p className="text-xs text-slate-500">
              Default time-to-live (TTL) applied to anonymous/guest jobs — signed-in users get their plan&apos;s own retention window.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={!settings || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {!settings ? (
          <p className="text-xs text-slate-400">Loading configuration...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Default Expiration Time</h4>
              <div className="space-y-2">
                {(
                  [
                    { id: '15_mins', label: '15 Minutes (Maximum Privacy)' },
                    { id: '1_hour', label: '1 Hour (Recommended)' },
                    { id: '24_hours', label: '24 Hours (Extended Buffer)' },
                  ] as { id: RetentionPolicy; label: string }[]
                ).map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer hover:border-indigo-400 transition-colors"
                  >
                    <input
                      type="radio"
                      name="retention"
                      checked={settings.defaultRetentionPolicy === opt.id}
                      onChange={() => setSettings({ ...settings, defaultRetentionPolicy: opt.id })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Automatic Purge Triggers</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  When enabled, the server executes a cleanup pass when:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600 list-disc list-inside">
                  <li>User finishes direct file download</li>
                  <li>Job reaches expiration timestamp (TTL)</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Immediate Post-Download Wipe</span>
                <button
                  onClick={() => setSettings({ ...settings, autoPurgeEnabled: !settings.autoPurgeEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoPurgeEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoPurgeEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

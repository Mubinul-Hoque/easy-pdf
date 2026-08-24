'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Megaphone,
  Save,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { AdminToolConfig } from '@/lib/admin-service';

interface AdminToolsTabProps {
  token?: string;
}

export const AdminToolsTab: React.FC<AdminToolsTabProps> = ({ token }) => {
  const [configs, setConfigs] = useState<AdminToolConfig[]>([]);
  const [banner, setBanner] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bannerSaved, setBannerSaved] = useState(false);

  const fetchConfigs = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/tools', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setConfigs(data.configs || []);
        setBanner(data.banner || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleToggleTool = async (toolId: string, currentEnabled: boolean) => {
    try {
      setSavingId(toolId);
      const next = !currentEnabled;
      const res = await fetch('/api/admin/tools', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ toolId, updates: { enabled: next } }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigs((prev) => prev.map((c) => (c.id === toolId ? { ...c, enabled: next } : c)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateLimit = async (toolId: string, maxFileSizeMb: number, batchLimit: number) => {
    try {
      setSavingId(toolId);
      const res = await fetch('/api/admin/tools', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ toolId, updates: { maxFileSizeMb, batchLimit } }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigs((prev) =>
          prev.map((c) => (c.id === toolId ? { ...c, maxFileSizeMb, batchLimit } : c))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveBanner = async () => {
    try {
      setBannerSaved(false);
      const res = await fetch('/api/admin/tools', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ bannerText: banner }),
      });
      const data = await res.json();
      if (data.success) {
        setBannerSaved(true);
        setTimeout(() => setBannerSaved(false), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. BROADCAST MAINTENANCE BANNER */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-indigo-600" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
            Global Announcement Banner
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Display a real-time banner notice at the top of all pages across the website (e.g. Scheduled maintenance, updates). Leave blank to disable.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={banner}
            onChange={(e) => setBanner(e.target.value)}
            placeholder="e.g. 🚀 Scheduled maintenance tonight from 02:00 to 02:30 UTC. Services will remain operational."
            className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <button
            onClick={handleSaveBanner}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            {bannerSaved ? 'Saved!' : 'Publish Banner'}
          </button>
        </div>
      </div>

      {/* 2. PDF TOOL CONFIGURATION SWITCHBOARD */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              Tool Operational Switchboard & Quotas
            </h3>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            {configs.filter((c) => c.enabled).length} of {configs.length} Tools Active
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {configs.map((tool) => (
            <div
              key={tool.id}
              className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
            >
              {/* Tool Info */}
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-xs border ${
                    tool.enabled
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                >
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    {tool.name}
                    {!tool.enabled && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Maintenance Mode
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">/tools/{tool.id}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                {/* Max File Size MB */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Max Size:</span>
                  <select
                    value={tool.maxFileSizeMb}
                    onChange={(e) =>
                      handleUpdateLimit(tool.id, parseInt(e.target.value, 10), tool.batchLimit)
                    }
                    className="text-xs font-semibold rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-slate-700"
                  >
                    <option value={25}>25 MB</option>
                    <option value={50}>50 MB</option>
                    <option value={100}>100 MB</option>
                    <option value={250}>250 MB</option>
                    <option value={500}>500 MB</option>
                  </select>
                </div>

                {/* Batch File Limit */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Batch Limit:</span>
                  <select
                    value={tool.batchLimit}
                    onChange={(e) =>
                      handleUpdateLimit(tool.id, tool.maxFileSizeMb, parseInt(e.target.value, 10))
                    }
                    className="text-xs font-semibold rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-slate-700"
                  >
                    <option value={5}>5 files</option>
                    <option value={10}>10 files</option>
                    <option value={25}>25 files</option>
                    <option value={50}>50 files</option>
                    <option value={100}>100 files</option>
                  </select>
                </div>

                {/* Status Toggle Switch */}
                <button
                  onClick={() => handleToggleTool(tool.id, tool.enabled)}
                  disabled={savingId === tool.id}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    tool.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tool.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

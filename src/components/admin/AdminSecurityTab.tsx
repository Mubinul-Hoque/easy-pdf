'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  Unlock,
  AlertTriangle,
  Clock,
  Terminal,
  Search,
  CheckCircle2,
  XCircle,
  Plus,
  Gauge,
  Save,
} from 'lucide-react';
import { SecurityAuditLog, BannedIP } from '@/lib/security-service';
import { SecuritySettings, RateLimitCategory } from '@/lib/security-settings';

interface AdminSecurityTabProps {
  token?: string;
  onNotification?: (msg: string) => void;
}

const RATE_LIMIT_LABELS: Record<RateLimitCategory, { title: string; description: string }> = {
  adminLogin: {
    title: 'Admin Login',
    description: 'Failed/attempted logins to this admin panel, per IP.',
  },
  otpSend: {
    title: 'OTP Send',
    description: 'Verification-code requests (register/login), per IP.',
  },
  otpVerify: {
    title: 'OTP Verify',
    description: 'Verification-code submission attempts, per IP.',
  },
  apiActions: {
    title: 'PDF API Actions',
    description: 'Merge/split/compress/etc. job submissions, per IP.',
  },
  general: {
    title: 'General API',
    description: 'Other public endpoints (e.g. upload ticket issuance), per IP.',
  },
};

export const AdminSecurityTab: React.FC<AdminSecurityTabProps> = ({ token, onNotification }) => {
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [bannedIps, setBannedIps] = useState<BannedIP[]>([]);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [addingBan, setAddingBan] = useState(false);

  const fetchSecurityData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/security', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setBannedIps(data.bannedIps || []);
        setSecurity(data.securitySettings || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  const handleBanIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;

    try {
      setAddingBan(true);
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'ban', ipAddress: newIp, reason: newReason }),
      });
      const data = await res.json();
      if (data.success && data.banned) {
        setBannedIps((prev) => [data.banned, ...prev]);
        setNewIp('');
        setNewReason('');
        if (onNotification) onNotification(`Blocked IP ${data.banned.ipAddress}`);
        fetchSecurityData();
      }
    } catch (err: any) {
      alert('Error banning IP: ' + err.message);
    } finally {
      setAddingBan(false);
    }
  };

  const handleUnbanIp = async (banId: string, ipAddress: string) => {
    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'unban', banId }),
      });
      const data = await res.json();
      if (data.success) {
        setBannedIps((prev) => prev.filter((b) => b.id !== banId));
        if (onNotification) onNotification(`Unbanned IP ${ipAddress}`);
      }
    } catch (err: any) {
      alert('Error unbanning IP: ' + err.message);
    }
  };

  const updateRuleField = (
    category: RateLimitCategory,
    field: 'enabled' | 'maxRequests' | 'windowSeconds',
    value: boolean | number
  ) => {
    setSecurity((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rateLimits: {
          ...prev.rateLimits,
          [category]: { ...prev.rateLimits[category], [field]: value },
        },
      };
    });
  };

  const handleSaveSecuritySettings = async () => {
    if (!security) return;
    try {
      setSavingSecurity(true);
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'updateSecuritySettings', settings: security }),
      });
      const data = await res.json();
      if (data.success) {
        setSecurity(data.securitySettings);
        if (onNotification) onNotification('Security & rate limiting settings saved');
      } else {
        alert(data.error?.message || 'Failed to save security settings');
      }
    } catch (err: any) {
      alert('Error saving security settings: ' + err.message);
    } finally {
      setSavingSecurity(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 0. RATE LIMITING & THREAT CONTROLS */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              Rate Limiting & Threat Controls
            </h3>
          </div>
          <button
            onClick={handleSaveSecuritySettings}
            disabled={!security || savingSecurity}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {savingSecurity ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {!security ? (
          <p className="text-xs text-slate-400">Loading configuration...</p>
        ) : (
          <>
            {/* IP Ban Enforcement Toggle */}
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-800">Enforce IP Ban List</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  When enabled, requests from banned IP addresses are rejected (403) on every gated endpoint below.
                </p>
              </div>
              <input
                type="checkbox"
                checked={security.ipBanEnforcementEnabled}
                onChange={(e) =>
                  setSecurity((prev) => (prev ? { ...prev, ipBanEnforcementEnabled: e.target.checked } : prev))
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            {/* Per-category rate limit rules */}
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
              {(Object.keys(RATE_LIMIT_LABELS) as RateLimitCategory[]).map((category) => {
                const rule = security.rateLimits[category];
                const label = RATE_LIMIT_LABELS[category];
                return (
                  <div key={category} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-white">
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-xs font-bold text-slate-800">{label.title}</p>
                      <p className="text-[11px] text-slate-500">{label.description}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => updateRuleField(category, 'enabled', e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Enabled
                      </label>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={100000}
                          value={rule.maxRequests}
                          onChange={(e) => updateRuleField(category, 'maxRequests', Number(e.target.value))}
                          className="w-20 px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <span className="text-[11px] text-slate-400">requests /</span>
                        <input
                          type="number"
                          min={1}
                          max={86400}
                          value={rule.windowSeconds}
                          onChange={(e) => updateRuleField(category, 'windowSeconds', Number(e.target.value))}
                          className="w-20 px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <span className="text-[11px] text-slate-400">sec</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 1. IP BANNING CONTROL */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Ban className="h-5 w-5 text-rose-600" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
            IP Firewall & Access Ban Control
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Immediately block abusive crawlers, scrapers, or brute-force attack vectors across the API Gateway.
        </p>

        <form onSubmit={handleBanIp} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="IP Address (e.g. 194.26.29.114)"
            className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 w-full sm:w-64"
          />
          <input
            type="text"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="Ban Reason (e.g. Rate limit abuse, brute force)"
            className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
          <button
            type="submit"
            disabled={addingBan}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {addingBan ? 'Blocking...' : 'Ban IP Address'}
          </button>
        </form>

        {/* Banned IPs list */}
        {bannedIps.length > 0 && (
          <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Active Banned Addresses ({bannedIps.length})
            </h4>
            {bannedIps.map((b) => (
              <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                    {b.ipAddress}
                  </span>
                  <span className="text-slate-600">{b.reason}</span>
                  <span className="text-[10px] text-slate-400">by {b.bannedBy}</span>
                </div>

                <button
                  onClick={() => handleUnbanIp(b.id, b.ipAddress)}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors font-medium text-[11px]"
                >
                  <Unlock className="h-3 w-3" /> Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. LIVE SECURITY AUDIT LOG */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              Security & Administrative Audit Logs
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Real-time gateway event trail</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-5 py-3">Event Type</th>
                <th className="px-4 py-3">Actor / Email</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Audit Details</th>
                <th className="px-5 py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {logs.map((log) => {
                const isFail = log.eventType.includes('FAILED');
                const isPurge = log.eventType.includes('PURGED');
                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg text-[10px] border ${
                          isFail
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isPurge
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {log.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{log.actorEmail}</td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{log.ipAddress}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.details?.message || JSON.stringify(log.details || '')}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

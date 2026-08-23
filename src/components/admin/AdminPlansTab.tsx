'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Save,
  CheckCircle2,
  AlertCircle,
  Sliders,
  DollarSign,
  Zap,
  Sparkles,
} from 'lucide-react';
import { Plan } from '@/lib/db';

interface AdminPlansTabProps {
  token?: string;
  onNotification?: (msg: string) => void;
}

export const AdminPlansTab: React.FC<AdminPlansTabProps> = ({ token, onNotification }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchPlans = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/plans', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleChange = (planId: string, field: keyof Plan, value: any) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, [field]: value } : p))
    );
  };

  const handleSavePlan = async (plan: Plan) => {
    try {
      setSavingId(plan.id);
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          planId: plan.id,
          updates: {
            name: plan.name,
            description: plan.description,
            price_monthly: Number(plan.price_monthly),
            price_yearly: Number(plan.price_yearly),
            max_file_size_bytes: Number(plan.max_file_size_bytes),
            daily_operations_limit: Number(plan.daily_operations_limit),
            ocr_monthly_pages: Number(plan.ocr_monthly_pages),
            batch_file_limit: Number(plan.batch_file_limit),
            storage_retention_hours: Number(plan.storage_retention_hours),
            is_active: plan.is_active ? 1 : 0,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (onNotification) onNotification(`Saved changes for ${plan.name}`);
      }
    } catch (err: any) {
      alert('Failed to save plan: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Subscription Plans & Quota Management</h3>
            <p className="text-xs text-slate-500">
              Edit pricing, file size thresholds, OCR monthly allowances, and batch limits live from the admin panel.
            </p>
          </div>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isPro = plan.slug === 'pro';
          const isBusiness = plan.slug === 'business';

          return (
            <div
              key={plan.id}
              className={`rounded-3xl border bg-white p-6 shadow-sm flex flex-col justify-between space-y-5 transition-all ${
                isBusiness
                  ? 'border-purple-200 ring-2 ring-purple-500/10'
                  : isPro
                  ? 'border-indigo-200 ring-2 ring-indigo-500/10'
                  : 'border-slate-200'
              }`}
            >
              <div className="space-y-4">
                {/* Plan Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border ${
                      isBusiness
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : isPro
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {plan.name}
                  </span>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <span>Active</span>
                    <input
                      type="checkbox"
                      checked={Boolean(plan.is_active)}
                      onChange={(e) => handleChange(plan.id, 'is_active', e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </label>
                </div>

                {/* Plan Name */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Plan Display Title
                  </label>
                  <input
                    type="text"
                    value={plan.name}
                    onChange={(e) => handleChange(plan.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Pricing Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Monthly Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={plan.price_monthly}
                      onChange={(e) => handleChange(plan.id, 'price_monthly', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Yearly Price ($)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={plan.price_yearly}
                      onChange={(e) => handleChange(plan.id, 'price_yearly', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Quota & Feature Limits */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Feature & Resource Limits
                  </h4>

                  {/* Max File Size MB */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Max File Size (MB):</span>
                    <input
                      type="number"
                      value={Math.round(plan.max_file_size_bytes / (1024 * 1024))}
                      onChange={(e) =>
                        handleChange(
                          plan.id,
                          'max_file_size_bytes',
                          Number(e.target.value) * 1024 * 1024
                        )
                      }
                      className="w-20 px-2 py-1 text-right font-mono font-bold rounded-lg border border-slate-200"
                    />
                  </div>

                  {/* Daily Ops Limit */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Daily Operations:</span>
                    <input
                      type="number"
                      value={plan.daily_operations_limit}
                      onChange={(e) => handleChange(plan.id, 'daily_operations_limit', e.target.value)}
                      className="w-20 px-2 py-1 text-right font-mono font-bold rounded-lg border border-slate-200"
                    />
                  </div>

                  {/* OCR Monthly Pages */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Monthly OCR Pages:</span>
                    <input
                      type="number"
                      value={plan.ocr_monthly_pages}
                      onChange={(e) => handleChange(plan.id, 'ocr_monthly_pages', e.target.value)}
                      className="w-20 px-2 py-1 text-right font-mono font-bold rounded-lg border border-slate-200"
                    />
                  </div>

                  {/* Batch Files Count */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Batch File Limit:</span>
                    <input
                      type="number"
                      value={plan.batch_file_limit}
                      onChange={(e) => handleChange(plan.id, 'batch_file_limit', e.target.value)}
                      className="w-20 px-2 py-1 text-right font-mono font-bold rounded-lg border border-slate-200"
                    />
                  </div>

                  {/* Retention Hours */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Retention (Hours):</span>
                    <input
                      type="number"
                      value={plan.storage_retention_hours}
                      onChange={(e) => handleChange(plan.id, 'storage_retention_hours', e.target.value)}
                      className="w-20 px-2 py-1 text-right font-mono font-bold rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Save Plan Button */}
              <button
                onClick={() => handleSavePlan(plan)}
                disabled={savingId === plan.id}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 px-4 text-xs font-bold text-white hover:bg-indigo-600 shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {savingId === plan.id ? 'Saving Plan...' : 'Save Plan Settings'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

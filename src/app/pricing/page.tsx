'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Check, Sparkles, ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import type { Plan } from '@/lib/db';

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

function formatRetention(hours: number): string {
  if (hours <= 1) return '60-minute automatic file deletion';
  if (hours < 24) return `${hours}-hour file retention window`;
  return `${Math.round(hours / 24)}-day personal document workspace`;
}

function planFeatures(plan: Plan): string[] {
  const features = [
    `Max file size: ${formatFileSize(plan.max_file_size_bytes)}`,
    plan.daily_operations_limit >= 9999
      ? 'Unlimited daily operations'
      : `Up to ${plan.daily_operations_limit} operations per day`,
    plan.batch_file_limit > 1
      ? `Batch processing up to ${plan.batch_file_limit} files`
      : 'Single-file processing',
  ];
  if (plan.ocr_monthly_pages > 0) {
    features.push(`${plan.ocr_monthly_pages.toLocaleString()} searchable OCR pages / mo`);
  }
  features.push(formatRetention(plan.storage_retention_hours));
  return features;
}

export default function PricingPage() {
  const { openAuthModal } = useAuth();
  const { settings } = useSettings();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/plans')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && Array.isArray(data.data)) {
          setPlans(data.data.filter((p: Plan) => p.is_active));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.price_monthly - b.price_monthly),
    [plans]
  );

  const faqs = [
    {
      q: 'Are my files kept secure and private?',
      a: 'Absolutely. EasyPDF never reads or mines your document contents. Files are processed client-side and are automatically wiped within your plan\'s retention window.',
    },
    {
      q: 'Can I cancel or change my plan anytime?',
      a: 'Reach out to us any time and we\'ll adjust your plan — there are no lock-in contracts.',
    },
    {
      q: 'How do I upgrade to a paid plan?',
      a: 'Create a free account, then contact our team to activate a paid plan for you. Self-serve online checkout is coming soon.',
    },
    {
      q: 'Is there a limit on how many files I can process as a Free user?',
      a: 'Free users get the daily operation count and file size limit shown on the Free plan card above. Paid plans unlock higher limits and batch processing.',
    },
  ];

  return (
    <div className="relative overflow-hidden py-16 sm:py-24 bg-[#f8fafc]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-bold text-indigo-700 shadow-sm backdrop-blur-md mb-4">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>Simple, Transparent Pricing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Plans for individuals and teams
          </h1>
          <p className="text-slate-600 text-base">
            Choose the plan that fits your document workflow. Unlock higher limits and batch capabilities.
          </p>

          {/* Billing Switcher */}
          <div className="mt-8 inline-flex items-center rounded-2xl bg-white border border-slate-200 p-1.5 shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-xl px-5 py-2 text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Yearly Billing</span>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 border border-emerald-200">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-500 text-sm font-semibold">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading current plans...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {sortedPlans.map((plan) => {
              const isFree = plan.price_monthly === 0;
              const isBusiness = plan.slug === 'business';
              const isFeatured = plan.slug === 'pro';
              const displayPrice = isFree
                ? 0
                : billingCycle === 'yearly'
                ? Math.round(plan.price_yearly / 12)
                : plan.price_monthly;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl border bg-white p-8 flex flex-col justify-between shadow-sm transition-all ${
                    isFeatured
                      ? 'border-2 border-indigo-600 shadow-xl shadow-indigo-500/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {isFeatured && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-bold text-white shadow-md">
                      Most Popular
                    </span>
                  )}

                  <div>
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
                      <p className="text-xs text-slate-500">{plan.description}</p>
                    </div>

                    <div className="mb-6 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-slate-900">${displayPrice}</span>
                      <span className="text-xs text-slate-500">{isFree ? '/ forever' : '/ month'}</span>
                    </div>

                    <ul className="space-y-3 text-xs text-slate-600 mb-8">
                      {planFeatures(plan).map((feature) => (
                        <li key={feature} className="flex items-center gap-2.5">
                          <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {isFree ? (
                    <Link
                      href="/"
                      className="w-full text-center rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-800 hover:bg-slate-200 transition-colors"
                    >
                      Get Started Free
                    </Link>
                  ) : isBusiness ? (
                    <a
                      href={`mailto:${settings.contactEmail}?subject=${encodeURIComponent(`${plan.name} plan inquiry`)}`}
                      className="w-full text-center rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
                    >
                      Contact Sales
                    </a>
                  ) : (
                    <button
                      onClick={() => openAuthModal({ mode: 'register' })}
                      className="w-full text-center rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
                    >
                      Create Free Account
                    </button>
                  )}

                  {!isFree && !isBusiness && (
                    <p className="mt-3 text-center text-[11px] text-slate-400">
                      Sign up free, then contact us to activate this plan.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* FAQs */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500">Everything you need to know about EasyPDF plans.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-slate-800 hover:text-indigo-600"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openFaq === idx ? 'rotate-180 text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3 font-normal">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, ChevronDown } from 'lucide-react';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const discount = billingCycle === 'yearly' ? 0.8 : 1;

  const faqs = [
    {
      q: 'Are my files kept secure and private?',
      a: 'Absolutely. EasyPDF never reads or mines your document contents. All files are encrypted using TLS 1.3 in transit and AES-256 at rest, and are automatically permanently wiped within 60 minutes for anonymous users.',
    },
    {
      q: 'Can I cancel or change my plan anytime?',
      a: 'Yes, you can upgrade, downgrade, or cancel your subscription at any time with a single click in your account billing portal. No lock-in contracts.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept all major credit cards (Visa, MasterCard, American Express), Apple Pay, Google Pay, and PayPal through our secure Stripe payment gateway.',
    },
    {
      q: 'Is there a limit on how many files I can process as a Free user?',
      a: 'Free users can perform up to 20 daily operations with files up to 50MB. Upgrading to Pro unlocks unlimited operations, batch processing up to 250MB per file, and priority queue execution.',
    },
  ];

  return (
    <div className="relative overflow-hidden py-16 sm:py-24 bg-[#f8fafc]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-bold text-indigo-700 shadow-sm backdrop-blur-md mb-4">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>Simple, Transparent SaaS Pricing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Plans for individuals and teams
          </h1>
          <p className="text-slate-600 text-base">
            Choose the plan that fits your document workflow. Unlock unlimited conversions and batch capabilities.
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {/* 1. FREE TIER */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 flex flex-col justify-between hover:border-slate-300 shadow-sm transition-all">
            <div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Free</h3>
                <p className="text-xs text-slate-500">Essential tools for casual document tasks.</p>
              </div>

              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">$0</span>
                <span className="text-xs text-slate-500">/ forever</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-600 mb-8">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Max file size: <strong>25 MB</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Up to 20 operations per day</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>All core tools (Merge, Split, Rotate, Compress)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>60-minute automatic file deletion</span>
                </li>
              </ul>
            </div>

            <Link
              href="/"
              className="w-full text-center rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-800 hover:bg-slate-200 transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          {/* 2. PRO TIER (Featured) */}
          <div className="relative rounded-3xl border-2 border-indigo-600 bg-white p-8 flex flex-col justify-between shadow-xl shadow-indigo-500/10">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-bold text-white shadow-md">
              Most Popular
            </span>

            <div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Pro Plan</h3>
                <p className="text-xs text-slate-500">Powerhouse for power users and freelancers.</p>
              </div>

              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">
                  ${(9 * discount).toFixed(0)}
                </span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-700 mb-8">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Max file size: <strong>250 MB</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span><strong>Unlimited</strong> operations</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Batch processing up to 10 files</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>500 Searchable OCR pages / mo</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Priority Queue Execution (Tier 1)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>7-day personal document workspace</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => alert('Proceeding to Stripe Checkout for Pro Plan...')}
              className="w-full text-center rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
            >
              Start 14-Day Free Trial
            </button>
          </div>

          {/* 3. BUSINESS TIER */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 flex flex-col justify-between hover:border-slate-300 shadow-sm transition-all">
            <div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Business</h3>
                <p className="text-xs text-slate-500">Team collaboration & massive scale workflows.</p>
              </div>

              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">
                  ${(29 * discount).toFixed(0)}
                </span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-600 mb-8">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Max file size: <strong>1 GB</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Batch processing up to 50 files</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>3,000 Searchable OCR pages / mo</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Dedicated VIP Worker Cluster</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>REST API Access & Webhooks</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => alert('Proceeding to Stripe Checkout for Business Plan...')}
              className="w-full text-center rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              Contact Sales / Buy Now
            </button>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500">Everything you need to know about EasyPDF security and subscriptions.</p>
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

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Scissors,
  Grid,
  RotateCw,
  Minimize2,
  Wrench,
  Search,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { PDF_TOOLS } from '@/lib/pdf-tools-data';
import { ToolCategory } from '@/lib/types';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'organize' | 'optimize'>('all');

  const filteredTools =
    selectedCategory === 'all'
      ? PDF_TOOLS
      : PDF_TOOLS.filter((t) => t.category === selectedCategory);

  const getToolIcon = (toolId: string) => {
    switch (toolId) {
      case 'merge-pdf':
        return <Layers className="h-6 w-6" />;
      case 'split-pdf':
        return <Scissors className="h-6 w-6" />;
      case 'organize-pdf':
        return <Grid className="h-6 w-6" />;
      case 'rotate-pdf':
        return <RotateCw className="h-6 w-6" />;
      case 'compress-pdf':
        return <Minimize2 className="h-6 w-6" />;
      case 'repair-pdf':
        return <Wrench className="h-6 w-6" />;
      case 'ocr-pdf':
        return <Search className="h-6 w-6" />;
      default:
        return <Layers className="h-6 w-6" />;
    }
  };

  const getToolGradientStyle = (toolId: string) => {
    switch (toolId) {
      case 'merge-pdf':
        return 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/25';
      case 'split-pdf':
        return 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-500/25';
      case 'organize-pdf':
        return 'bg-gradient-to-tr from-purple-600 to-pink-600 shadow-purple-500/25';
      case 'rotate-pdf':
        return 'bg-gradient-to-tr from-pink-600 to-rose-600 shadow-pink-500/25';
      case 'compress-pdf':
        return 'bg-gradient-to-tr from-amber-500 to-orange-600 shadow-amber-500/25';
      case 'repair-pdf':
        return 'bg-gradient-to-tr from-rose-600 to-red-600 shadow-rose-500/25';
      case 'ocr-pdf':
        return 'bg-gradient-to-tr from-violet-600 to-purple-600 shadow-violet-500/25';
      default:
        return 'bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-indigo-500/25';
    }
  };

  return (
    <div className="relative overflow-hidden bg-[#f8fafc]">
      {/* Subtle light glowing gradient */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[350px] w-[700px] rounded-full bg-indigo-500/10 blur-[80px]" />

      {/* 1. CONCISE & MINIMAL HERO SECTION */}
      <section className="relative pt-8 pb-6 sm:pt-10 sm:pb-8 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Compact Title */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2">
          Every tool you need to work with <span className="text-indigo-600">PDFs</span>
        </h1>

        {/* Minimal Subtitle */}
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto mb-5 leading-normal">
          Fast, private online tools to merge, split, compress, rotate, and organize PDF documents.
        </p>

        {/* Compact Quick Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/tools/merge-pdf"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            Merge PDF
          </Link>
          <Link
            href="/tools/organize-pdf"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Grid className="h-3.5 w-3.5 text-purple-500" />
            Organize PDF
          </Link>
          <Link
            href="/tools/compress-pdf"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Minimize2 className="h-3.5 w-3.5 text-amber-500" />
            Compress
          </Link>
        </div>
      </section>

      {/* 2. PDF TOOLS FILTER TABS & WORKSPACE GRID */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Category Selector Tabs */}
        <div className="flex items-center justify-center gap-1.5 mb-8 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            All Tools ({PDF_TOOLS.length})
          </button>
          <button
            onClick={() => setSelectedCategory('organize')}
            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              selectedCategory === 'organize'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Organize PDF
          </button>
          <button
            onClick={() => setSelectedCategory('optimize')}
            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              selectedCategory === 'optimize'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Optimize PDF
          </button>
        </div>

        {/* Tools Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTools.map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 hover:border-indigo-400 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
            >
              <div>
                {/* Header with Icon & Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${getToolGradientStyle(
                      tool.id
                    )} text-white shadow-sm group-hover:scale-105 transition-transform duration-200`}
                  >
                    {getToolIcon(tool.id)}
                  </div>
                  {tool.badge && (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600 border border-indigo-200">
                      {tool.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-indigo-600 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4 font-normal line-clamp-2">
                  {tool.description}
                </p>
              </div>

              {/* Action Link */}
              <div className="flex items-center text-xs font-bold text-indigo-600 group-hover:text-indigo-700 pt-3 border-t border-slate-100">
                <span>Launch Tool</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-slate-200">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">How EasyPDF Works</h2>
          <p className="text-slate-500 text-xs">Simple 3-step workflow engineered for maximum speed and security.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 font-bold text-base">
              1
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">Upload Files</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Select or drop PDFs into our secure encrypted dropzone directly from your device or cloud.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200 font-bold text-base">
              2
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">Configure & Process</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Reorder pages, set compression levels, or choose conversion targets with interactive live previews.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold text-base">
              3
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">Instant Download</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Download your processed document immediately. All temporary files auto-purge within 60 minutes.</p>
          </div>
        </div>
      </section>

      {/* 4. SECURITY & PRIVACY PROMISE */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/70 p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200 mb-3">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Zero-Data Retention Policy</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Your Privacy is Our #1 Priority</h2>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">
                Unlike other converters, EasyPDF processes tasks using client-side edge rendering and isolated ephemeral workers. We never store, inspect, or sell your documents. All files are wiped automatically after 60 minutes.
              </p>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> End-to-end TLS 1.3 encryption
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Automated 60-minute hard file purging
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> No AI or ML training on customer data
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center justify-center text-center p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-3">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Enterprise Grade Security</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                Trusted by thousands of privacy-conscious professionals worldwide.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition-colors"
              >
                View Plans & Features
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

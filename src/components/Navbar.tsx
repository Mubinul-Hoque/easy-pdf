'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  ChevronDown,
  Sparkles,
  Menu,
  X,
  Grid,
  FileText,
  Combine,
  Scissors,
  RotateCw,
  Minimize2,
  Wrench,
  Search,
} from 'lucide-react';
import { PDF_TOOLS } from '@/lib/pdf-tools-data';

export const Navbar = () => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const organizeTools = PDF_TOOLS.filter((t) => t.category === 'organize');
  const optimizeTools = PDF_TOOLS.filter((t) => t.category === 'optimize');

  const renderToolIcon = (iconName: string, category: string) => {
    const iconClass = "h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110";

    switch (iconName) {
      case 'Combine':
      case 'Layers':
        return <Combine className={`${iconClass} text-indigo-500`} />;
      case 'Scissors':
        return <Scissors className={`${iconClass} text-indigo-500`} />;
      case 'RotateCw':
        return <RotateCw className={`${iconClass} text-indigo-500`} />;
      case 'Grid':
        return <Grid className={`${iconClass} text-indigo-500`} />;
      case 'Minimize2':
        return <Minimize2 className={`${iconClass} text-amber-500`} />;
      case 'Wrench':
        return <Wrench className={`${iconClass} text-rose-500`} />;
      case 'Search':
        return <Search className={`${iconClass} text-purple-500`} />;
      default:
        return <FileText className={`${iconClass} text-slate-500`} />;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              Easy<span className="text-indigo-600">PDF</span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 border border-indigo-200">
                PRO
              </span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {/* All PDF Tools Mega Dropdown */}
          <div className="relative">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              onMouseEnter={() => setToolsOpen(true)}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
            >
              All Tools
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  toolsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {toolsOpen && (
              <div
                onMouseLeave={() => setToolsOpen(false)}
                className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[460px] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl backdrop-blur-2xl grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200 z-50"
              >
                {/* Column 1: Organize */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2.5 flex items-center gap-1.5 px-2">
                    <Grid className="h-3.5 w-3.5" /> Organize PDF
                  </h4>
                  <div className="space-y-0.5">
                    {organizeTools.map((t) => (
                      <Link
                        key={t.id}
                        href={t.href}
                        onClick={() => setToolsOpen(false)}
                        className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-indigo-50/70 transition-colors"
                      >
                        {renderToolIcon(t.icon, t.category)}
                        <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors truncate">
                          {t.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Column 2: Optimize */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2.5 flex items-center gap-1.5 px-2">
                    <Sparkles className="h-3.5 w-3.5" /> Optimize PDF
                  </h4>
                  <div className="space-y-0.5">
                    {optimizeTools.map((t) => (
                      <Link
                        key={t.id}
                        href={t.href}
                        onClick={() => setToolsOpen(false)}
                        className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-amber-50/70 transition-colors"
                      >
                        {renderToolIcon(t.icon, t.category)}
                        <span className="text-sm font-medium text-slate-700 group-hover:text-amber-600 transition-colors truncate">
                          {t.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/tools/merge-pdf"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
          >
            Merge
          </Link>
          <Link
            href="/tools/split-pdf"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
          >
            Split
          </Link>
          <Link
            href="/tools/organize-pdf"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
          >
            Organize
          </Link>
          <Link
            href="/tools/rotate-pdf"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
          >
            Rotate
          </Link>
          <Link
            href="/tools/compress-pdf"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
          >
            Compress
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
          >
            Pricing
          </Link>
        </nav>

        {/* Right CTA Area */}
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="relative inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all duration-200"
          >
            Upgrade to Pro
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 py-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {PDF_TOOLS.map((t) => (
              <Link
                key={t.id}
                href={t.href}
                onClick={() => setMobileMenuOpen(false)}
                className="group flex items-center gap-2 rounded-lg p-2.5 bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
              >
                {renderToolIcon(t.icon, t.category)}
                <span className="truncate">{t.name}</span>
              </Link>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-200">
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white"
            >
              View Pricing & Plans
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

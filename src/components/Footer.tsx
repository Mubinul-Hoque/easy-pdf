import React from 'react';
import Link from 'next/link';
import { Layers, ShieldCheck, Lock, Zap } from 'lucide-react';
import { PDF_TOOLS } from '@/lib/pdf-tools-data';

export const Footer = () => {
  const organize = PDF_TOOLS.filter((t) => t.category === 'organize');
  const optimize = PDF_TOOLS.filter((t) => t.category === 'optimize');

  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600 text-sm">
      {/* Privacy & Trust Banner */}
      <div className="border-b border-slate-200/80 bg-slate-50/70 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">100% Secure & Private</h4>
              <p className="text-xs text-slate-500">Files are encrypted and auto-deleted within 60 minutes.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-200">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Lightning Fast Processing</h4>
              <p className="text-xs text-slate-500">High-performance client & distributed worker pipeline.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">ISO 27001 & GDPR Compliant</h4>
              <p className="text-xs text-slate-500">Zero data retention and no machine learning mining.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-8">
        {/* Brand Col */}
        <div className="col-span-2 space-y-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-900">
              Easy<span className="text-indigo-600">PDF</span>
            </span>
          </Link>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            The next-generation online PDF workspace. Merge, split, rotate, compress, repair, and organize documents with uncompromising speed, quality, and privacy.
          </p>
          <div className="pt-2 text-xs text-slate-400">
            © {new Date().getFullYear()} EasyPDF Platform Inc. All rights reserved.
          </div>
        </div>

        {/* Organize */}
        <div>
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Organize PDF</h4>
          <ul className="space-y-2 text-xs">
            {organize.map((t) => (
              <li key={t.id}>
                <Link href={t.href} className="hover:text-indigo-600 transition-colors">
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Optimize */}
        <div>
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Optimize PDF</h4>
          <ul className="space-y-2 text-xs">
            {optimize.map((t) => (
              <li key={t.id}>
                <Link href={t.href} className="hover:text-amber-600 transition-colors">
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing & Resources */}
        <div>
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Account & Plans</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/pricing" className="text-indigo-600 font-medium hover:underline">
                Pricing & Plans
              </Link>
            </li>
            <li>
              <Link href="/" className="hover:text-slate-900 transition-colors">
                All Tools
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1">
                Admin Portal
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

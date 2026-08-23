'use client';

import React from 'react';
import {
  Menu,
  RotateCw,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { AdminTab } from './AdminSidebar';

interface AdminNavbarProps {
  currentTab: AdminTab;
  onOpenMobileMenu: () => void;
  onRefresh: () => void;
  onPurgeStorage: () => void;
  isRefreshing: boolean;
  isPurging: boolean;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  currentTab,
  onOpenMobileMenu,
  onRefresh,
  onPurgeStorage,
  isRefreshing,
  isPurging,
}) => {
  const getTabTitle = (tab: AdminTab) => {
    switch (tab) {
      case 'overview':
        return { title: 'Executive Overview', desc: 'Real-time platform metrics, KPIs, and job processing volume.' };
      case 'users':
        return { title: 'Users & Accounts', desc: 'Manage user accounts, plan limits, and subscription status.' };
      case 'plans':
        return { title: 'Plan Pricing & Feature Limits', desc: 'Configure tier prices, monthly OCR pages, and upload limits.' };
      case 'files':
        return { title: 'Storage & Zero-Retention', desc: 'Monitor temporary storage, retention TTL, and run storage purges.' };
      case 'tools':
        return { title: 'PDF Tool Switchboard', desc: 'Toggle tools on/off, customize upload limits, and broadcast banners.' };
      case 'security':
        return { title: 'Security & IP Firewall', desc: 'Inspect administrative audit events and manage blocked IPs.' };
      case 'system':
        return { title: 'System Diagnostics & DB Schema', desc: 'Inspect database pools, memory health, and run migrations.' };
    }
  };

  const current = getTabTitle(currentTab);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 sm:px-8 backdrop-blur-xl">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            {current.title}
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Gateway
            </span>
          </h1>
          <p className="hidden md:block text-[11px] text-slate-500">{current.desc}</p>
        </div>
      </div>

      {/* Right: Quick Actions */}
      <div className="flex items-center gap-2.5">
        {/* Refresh Data */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RotateCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {/* Force Storage Purge */}
        <button
          onClick={onPurgeStorage}
          disabled={isPurging}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100 transition-colors disabled:opacity-50"
        >
          <Trash2 className={`h-3.5 w-3.5 ${isPurging ? 'animate-bounce' : ''}`} />
          <span className="hidden sm:inline">Purge Storage</span>
        </button>
      </div>
    </header>
  );
};

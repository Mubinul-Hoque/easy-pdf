'use client';

import React from 'react';
import Link from 'next/link';
import {
  Layers,
  LayoutDashboard,
  Users,
  HardDrive,
  Sliders,
  Activity,
  LogOut,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  ShieldAlert,
  Palette,
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import type { AdminUser } from '@/lib/admin-auth';

export type AdminTab = 'overview' | 'users' | 'plans' | 'files' | 'tools' | 'security' | 'settings' | 'system';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  user: AdminUser | null;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  isOpen,
  onClose,
}) => {
  const { settings } = useSettings();
  const navItems: Array<{ id: AdminTab; label: string; icon: any; badge?: string }> = [
    { id: 'overview', label: 'Overview & KPIs', icon: LayoutDashboard },
    { id: 'users', label: 'Users & Accounts', icon: Users },
    { id: 'plans', label: 'Plan Pricing & Quotas', icon: CreditCard },
    { id: 'files', label: 'Storage & Retention', icon: HardDrive },
    { id: 'tools', label: 'PDF Tool Switchboard', icon: Sliders },
    { id: 'settings', label: 'Branding & Settings', icon: Palette },
    { id: 'security', label: 'Security & IP Bans', icon: ShieldAlert },
    { id: 'system', label: 'System Health & DB', icon: Activity },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-slate-800 bg-[#0b1120] text-slate-300 transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding */}
        <div>
          <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-6">
            <Link href="/admin" className="flex items-center gap-2.5 group">
              {settings.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <div className="flex items-center gap-2">
                  <img
                    src={settings.logoUrl}
                    alt={settings.appName || 'Admin Logo'}
                    className="h-8 max-w-[150px] object-contain group-hover:scale-105 transition-transform duration-200"
                  />
                  <span className="rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-indigo-300 border border-indigo-500/30">
                    Admin
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-200">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                      {settings.appName && settings.appName.toLowerCase() !== 'easypdf' ? (
                        settings.appName
                      ) : (
                        <>
                          Easy<span className="text-indigo-400">PDF</span>
                        </>
                      )}
                      <span className="rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-indigo-300 border border-indigo-500/30">
                        Admin
                      </span>
                    </span>
                  </div>
                </>
              )}
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Management Suite
            </p>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-80" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile & Live Link */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <Link
            href="/"
            target="_blank"
            className="flex w-full items-center justify-between rounded-xl bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
              View Live Website
            </span>
            <span className="text-[10px] text-slate-400">v1.4</span>
          </Link>

          {/* Admin User Card */}
          <div className="flex items-center justify-between rounded-xl bg-slate-800/40 p-2.5 border border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-950 text-indigo-400 font-bold text-xs border border-indigo-800">
                {user?.name ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@easypdf.com'}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Logout from Admin"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/context/SettingsContext';
import { Wrench, ShieldCheck } from 'lucide-react';

/**
 * Blocks the public-facing site behind a maintenance page when the admin
 * toggles "Maintenance Mode" in Branding & Settings. Admin routes are always
 * exempt so an admin can still get in to switch it back off.
 */
export const MaintenanceGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { settings } = useSettings();

  const isAdminRoute = pathname?.startsWith('/admin');

  if (settings.maintenanceMode && !isAdminRoute) {
    return (
      <div className="flex min-h-[70vh] flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600">
          <Wrench className="h-8 w-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">
          {settings.appName || 'EasyPDF'} is undergoing scheduled maintenance
        </h1>
        <p className="text-slate-500 text-sm max-w-md mb-6">
          We&apos;re making some improvements behind the scenes. Please check back shortly — your files and account are untouched.
        </p>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          Zero-Retention Privacy — Still Active
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MaintenanceGate;

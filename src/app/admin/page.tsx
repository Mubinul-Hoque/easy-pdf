'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar, AdminTab } from '@/components/admin/AdminSidebar';
import { AdminNavbar } from '@/components/admin/AdminNavbar';
import { AdminOverviewTab } from '@/components/admin/AdminOverviewTab';
import { AdminUsersTab } from '@/components/admin/AdminUsersTab';
import { AdminPlansTab } from '@/components/admin/AdminPlansTab';
import { AdminFilesTab } from '@/components/admin/AdminFilesTab';
import { AdminToolsTab } from '@/components/admin/AdminToolsTab';
import { AdminSecurityTab } from '@/components/admin/AdminSecurityTab';
import { AdminSettingsTab } from '@/components/admin/AdminSettingsTab';
import { AdminSystemTab } from '@/components/admin/AdminSystemTab';
import type { AdminStats, AdminJobRecord } from '@/lib/admin-service';
import type { AdminUser } from '@/lib/admin-auth';
import { Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<AdminJobRecord[]>([]);
  const [token, setToken] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purging, setPurging] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // 1. Check Authentication on Mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('easypdf_admin_token') || '';
      if (!storedToken) {
        router.push('/admin/login');
        return;
      }

      try {
        const res = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', token: storedToken }),
        });
        const data = await res.json();

        if (data.success && data.user) {
          setUser(data.user);
          setToken(storedToken);
          fetchDashboardData(storedToken);
        } else {
          localStorage.removeItem('easypdf_admin_token');
          router.push('/admin/login');
        }
      } catch (err) {
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 2. Fetch Live Dashboard Metrics
  const fetchDashboardData = async (authToken?: string) => {
    try {
      setRefreshing(true);
      const activeToken = authToken || token;
      const res = await fetch('/api/admin/stats', {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentJobs(data.recentJobs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  // 3. Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // Ignore
    }
    localStorage.removeItem('easypdf_admin_token');
    router.push('/admin/login');
  };

  // 4. Force Purge Storage Action
  const handlePurgeStorage = async () => {
    if (!confirm('Are you sure you want to force-purge all temporary files and job artifacts from storage?')) {
      return;
    }

    try {
      setPurging(true);
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'purge_storage' }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Storage successfully purged with Zero-Retention verification.');
        fetchDashboardData();
      }
    } catch (err: any) {
      alert('Purge error: ' + err.message);
    } finally {
      setPurging(false);
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Activity className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-xs font-semibold text-slate-400">Verifying secure admin access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex">
      {/* Sidebar */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        user={user}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-72 flex flex-col min-w-0">
        <AdminNavbar
          currentTab={currentTab}
          onOpenMobileMenu={() => setSidebarOpen(true)}
          onRefresh={() => fetchDashboardData()}
          onPurgeStorage={handlePurgeStorage}
          isRefreshing={refreshing}
          isPurging={purging}
        />

        {/* Global Toast Notification */}
        {notification && (
          <div className="fixed bottom-5 right-5 z-50 rounded-2xl bg-emerald-900/90 border border-emerald-500/50 p-4 text-xs font-bold text-emerald-200 shadow-2xl backdrop-blur-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Tab Pages */}
        <main className="p-4 sm:p-8 flex-1 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <AdminOverviewTab
              stats={stats}
              recentJobs={recentJobs}
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onNotification={showNotification}
            />
          )}

          {currentTab === 'users' && <AdminUsersTab token={token} />}

          {currentTab === 'plans' && (
            <AdminPlansTab token={token} onNotification={showNotification} />
          )}

          {currentTab === 'files' && (
            <AdminFilesTab
              stats={stats}
              onPurgeStorage={handlePurgeStorage}
              isPurging={purging}
              token={token}
              onNotification={showNotification}
            />
          )}

          {currentTab === 'tools' && <AdminToolsTab token={token} />}

          {currentTab === 'settings' && (
            <AdminSettingsTab token={token} onNotification={showNotification} />
          )}

          {currentTab === 'security' && (
            <AdminSecurityTab token={token} onNotification={showNotification} />
          )}

          {currentTab === 'system' && (
            <AdminSystemTab token={token} onNotification={showNotification} />
          )}
        </main>
      </div>
    </div>
  );
}

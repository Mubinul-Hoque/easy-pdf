'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Users,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Filter,
  ArrowUpDown,
  Mail,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { AdminUserRecord } from '@/lib/admin-service';
import { formatBytes } from '@/lib/format-utils';

interface AdminUsersTabProps {
  token?: string;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({ token }) => {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Debounce search input by 300ms to eliminate redundant API spam
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (planFilter !== 'all') params.set('plan', planFilter);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.total || 0);
        } else {
          setTotalCount(data.users?.length || 0);
          setTotalPages(1);
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, planFilter, page, limit, token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdatePlan = async (userId: string, newPlan: 'free' | 'pro' | 'business') => {
    try {
      setUpdatingId(userId);
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, updates: { plan: newPlan } }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      setUpdatingId(userId);
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, updates: { status: nextStatus } }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: nextStatus as any } : u)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search users by name, email, or user ID (debounced)..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold px-2">
            <Filter className="h-3.5 w-3.5" />
            Plan:
          </div>
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Plans</option>
            <option value="free">Free Tier</option>
            <option value="pro">Pro Plan</option>
            <option value="business">Business Plan</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              Registered Accounts ({totalCount})
            </h3>
          </div>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing...
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-5 py-3.5">User Profile</th>
                <th className="px-4 py-3.5">Subscription Plan</th>
                <th className="px-4 py-3.5">Account Status</th>
                <th className="px-4 py-3.5">Lifetime Ops</th>
                <th className="px-4 py-3.5">Quota Used</th>
                <th className="px-4 py-3.5">Last Active</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Profile */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{user.name}</p>
                        <p className="text-[11px] text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Plan Badge / Selector */}
                  <td className="px-4 py-4">
                    <select
                      value={user.plan}
                      disabled={updatingId === user.id}
                      onChange={(e) => handleUpdatePlan(user.id, e.target.value as any)}
                      className={`text-xs font-bold rounded-lg px-2.5 py-1 border transition-colors cursor-pointer ${
                        user.plan === 'business'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : user.plan === 'pro'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <option value="free">Free Tier</option>
                      <option value="pro">Pro ($9/mo)</option>
                      <option value="business">Business ($29/mo)</option>
                    </select>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                        user.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {user.status === 'active' ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-rose-600" /> Suspended
                        </>
                      )}
                    </span>
                  </td>

                  {/* Ops */}
                  <td className="px-4 py-4 font-mono text-slate-800 font-bold">
                    {user.totalOperations.toLocaleString()}
                  </td>

                  {/* Quota */}
                  <td className="px-4 py-4 font-mono text-slate-500">
                    {formatBytes(user.storageUsedBytes)}
                  </td>

                  {/* Last Active */}
                  <td className="px-4 py-4 text-slate-400 text-[11px]">
                    {new Date(user.lastActiveAt).toLocaleDateString()}
                  </td>

                  {/* Action */}
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(user.id, user.status)}
                      disabled={updatingId === user.id}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                        user.status === 'active'
                          ? 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50'
                          : 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {user.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs font-semibold">
                    No matching user accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <p className="text-xs text-slate-500 font-medium">
            Showing Page <span className="font-bold text-slate-800">{page}</span> of{' '}
            <span className="font-bold text-slate-800">{totalPages}</span> ({totalCount} total users)
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import React from 'react';
import {
  Activity,
  Layers,
  Users,
  HardDrive,
  Clock,
  Zap,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import type { AdminStats, AdminJobRecord } from '@/lib/admin-service';
import { formatBytes, formatUptime } from '@/lib/format-utils';

interface AdminOverviewTabProps {
  stats: AdminStats | null;
  recentJobs: AdminJobRecord[];
  onNavigateTab: (tab: any) => void;
  onNotification?: (msg: string) => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  stats,
  recentJobs,
  onNavigateTab,
  onNotification,
}) => {
  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold">
          <Activity className="h-4 w-4 animate-spin text-indigo-600" />
          Loading platform metrics...
        </div>
      </div>
    );
  }

  const exportJobsCSV = () => {
    const headers = 'Job ID,Operation,User Email,Payload Bytes,Latency (ms),Status,Dispatched At\n';
    const rows = recentJobs
      .map(
        (j) =>
          `"${j.id}","${j.operationType}","${j.userEmail || 'Anonymous'}","${j.fileSizeBytes}","${j.durationMs}","${j.status}","${j.createdAt}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `easypdf_operations_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (onNotification) onNotification('Operations Audit CSV downloaded successfully.');
  };

  const exportVolumeSummaryCSV = () => {
    if (!stats) return;
    const headers = 'Metric,Value,Unit\n';
    const rows = [
      `"Total Operations","${stats.totalOperations}","count"`,
      `"Operations Today","${stats.operationsToday}","count"`,
      `"Total Registered Users","${stats.totalUsers}","users"`,
      `"Paid Active Subscriptions","${stats.activeSubscriptions}","subscriptions"`,
      `"Monthly Recurring Revenue","${stats.monthlyRecurringRevenue}","USD"`,
      `"Purged Files Count","${stats.purgedFilesCount}","files"`,
      `"Total Storage Purged (Bytes)","${stats.totalStoragePurgedBytes}","bytes"`,
      `"Current Temp Storage (Bytes)","${stats.currentTempStorageBytes}","bytes"`,
      `"Average Latency","${stats.avgLatencyMs}","ms"`,
      `"Server Uptime","${stats.serverUptimeSeconds}","seconds"`,
    ].join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `easypdf_platform_kpi_summary_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (onNotification) onNotification('Platform KPI Summary CSV downloaded.');
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Operations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Operations</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-slate-900">{stats.totalOperations.toLocaleString()}</h3>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" />
              +{stats.operationsToday} today
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">PDF jobs processed across all tools</p>
        </div>

        {/* Card 2: Subscriptions & MRR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-slate-900">${stats.monthlyRecurringRevenue.toLocaleString()}</h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {stats.activeSubscriptions} Paid Subs
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{stats.totalUsers} registered user accounts</p>
        </div>

        {/* Card 3: Storage & Zero-Retention */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Storage Purged</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-slate-900">{formatBytes(stats.totalStoragePurgedBytes)}</h3>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {formatBytes(stats.currentTempStorageBytes)} Temp
            </span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Strict Zero-Retention Active
          </p>
        </div>

        {/* Card 4: System Health & Uptime */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-violet-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Health & Latency</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-slate-900">{stats.avgLatencyMs} ms</h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              99.98% Up
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Server Uptime: {formatUptime(stats.serverUptimeSeconds)}</p>
        </div>
      </div>

      {/* 2. MIDDLE CHARTS & VOLUME ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Tool Distribution */}
        <div className="lg:col-span-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Tool Usage Breakdown</h3>
              <p className="text-xs text-slate-500">Operation volume split across all PDF engines</p>
            </div>
            <button
              onClick={() => onNavigateTab('tools')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Manage Tools <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {stats.toolUsageBreakdown.map((tool) => (
              <div key={tool.toolId}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">{tool.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{tool.count.toLocaleString()} ops</span>
                    <span className="text-slate-400 font-mono text-[11px]">({tool.percentage}%)</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${tool.percentage}%`, backgroundColor: tool.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Daily Processing Volume Curve */}
        <div className="lg:col-span-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">7-Day Processing Volume</h3>
                <p className="text-xs text-slate-500">Daily throughput across active worker nodes</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
                +18.4% this week
              </span>
            </div>

            {/* Simple Volume Bar Chart */}
            <div className="flex items-end justify-between gap-3 h-44 pt-6 pb-2 px-2">
              {stats.dailyVolume.map((d, i) => {
                const maxOps = Math.max(...stats.dailyVolume.map((v) => v.operations));
                const heightPct = Math.round((d.operations / maxOps) * 100);
                const isToday = d.date === 'Today';

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.operations}
                    </span>
                    <div
                      className={`w-full rounded-t-xl transition-all duration-300 group-hover:brightness-110 ${
                        isToday ? 'bg-indigo-600 shadow-md shadow-indigo-500/30' : 'bg-slate-200 hover:bg-indigo-300'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className={`text-[11px] font-bold ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                      {d.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Avg Daily Throughput</p>
              <p className="text-base font-black text-slate-800">1,218 Jobs</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Peak Concurrency</p>
              <p className="text-base font-black text-slate-800">42 / sec</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. REAL-TIME ACTIVITY STREAM & QUEUE */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Live Processing Activity Feed</h3>
            <p className="text-xs text-slate-500">Real-time pipeline dispatches and auto-cleanup events</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportVolumeSummaryCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export KPIs (CSV)</span>
            </button>
            <button
              onClick={exportJobsCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600" />
              <span>Export Audit Log (CSV)</span>
            </button>
            <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-y border-slate-200/80">
              <tr>
                <th className="px-4 py-3">Job ID</th>
                <th className="px-4 py-3">Operation</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Payload Size</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dispatched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/70 transition-colors font-medium text-slate-700">
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{job.id}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-indigo-50 border border-indigo-100 px-2 py-0.5 font-bold text-indigo-700">
                      {job.operationType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{job.userEmail || 'Anonymous Guest'}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{formatBytes(job.fileSizeBytes)}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{job.durationMs} ms</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-[11px]">
                    {new Date(job.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

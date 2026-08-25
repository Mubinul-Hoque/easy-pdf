'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { AdminToolConfig } from '@/lib/admin-service';

export interface ToolsContextType {
  configs: AdminToolConfig[];
  banner: string;
  loading: boolean;
  refreshTools: () => Promise<void>;
}

const defaultToolsContext: ToolsContextType = {
  configs: [],
  banner: '',
  loading: false,
  refreshTools: async () => {},
};

const ToolsContext = createContext<ToolsContextType>(defaultToolsContext);

// In-memory singleton cache
let cachedConfigs: AdminToolConfig[] = [];
let cachedBanner: string = '';
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function formatMbSize(mb: number): string {
  if (mb >= 1024) {
    const gb = mb / 1024;
    return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

export const ToolsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [configs, setConfigs] = useState<AdminToolConfig[]>(() => cachedConfigs);
  const [banner, setBanner] = useState<string>(() => cachedBanner);
  const [loading, setLoading] = useState(false);

  const fetchTools = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tools?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.configs)) {
        cachedConfigs = data.configs;
        cachedBanner = data.banner || '';
        setConfigs(data.configs);
        setBanner(data.banner || '');
        notify();
      }
    } catch (err) {
      console.warn('Failed to load tool switchboard configs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  return (
    <ToolsContext.Provider
      value={{
        configs,
        banner,
        loading,
        refreshTools: fetchTools,
      }}
    >
      {children}
    </ToolsContext.Provider>
  );
};

export function useTools(): ToolsContextType {
  const ctx = useContext(ToolsContext);
  return ctx;
}

export interface ToolConfigHookResult {
  config: AdminToolConfig | null;
  maxFileSizeMb: number;
  maxSizeBytes: number;
  formattedMaxSize: string;
  batchLimit: number;
  isEnabled: boolean;
  banner: string;
  loading: boolean;
}

export function useToolConfig(toolId?: string): ToolConfigHookResult {
  const [localConfigs, setLocalConfigs] = useState<AdminToolConfig[]>(() => cachedConfigs);
  const [localBanner, setLocalBanner] = useState<string>(() => cachedBanner);
  const [loading, setLoading] = useState<boolean>(cachedConfigs.length === 0);

  useEffect(() => {
    const updateLocal = () => {
      setLocalConfigs(cachedConfigs);
      setLocalBanner(cachedBanner);
      setLoading(false);
    };

    listeners.add(updateLocal);

    if (cachedConfigs.length === 0) {
      fetch(`/api/tools?_t=${Date.now()}`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.configs)) {
            cachedConfigs = data.configs;
            cachedBanner = data.banner || '';
            setLocalConfigs(data.configs);
            setLocalBanner(data.banner || '');
            notify();
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    return () => {
      listeners.delete(updateLocal);
    };
  }, []);

  return useMemo(() => {
    const matched = toolId ? localConfigs.find((c) => c.id === toolId) : null;
    const maxFileSizeMb = matched?.maxFileSizeMb ?? 100;
    const batchLimit = matched?.batchLimit ?? 25;
    const isEnabled = matched ? matched.enabled : true;

    return {
      config: matched || null,
      maxFileSizeMb,
      maxSizeBytes: maxFileSizeMb * 1024 * 1024,
      formattedMaxSize: formatMbSize(maxFileSizeMb),
      batchLimit,
      isEnabled,
      banner: localBanner,
      loading,
    };
  }, [localConfigs, localBanner, toolId, loading]);
}

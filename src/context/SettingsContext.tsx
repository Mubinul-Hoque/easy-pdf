'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SiteSettings, DEFAULT_SETTINGS } from '@/lib/settings-types';

interface SettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: false,
  refreshSettings: async () => {},
});

// Singleton reactive store
let globalSettings: SiteSettings = { ...DEFAULT_SETTINGS };

// Load initial from localStorage if available in browser
if (typeof window !== 'undefined') {
  try {
    const cached = localStorage.getItem('easypdf_site_settings');
    if (cached) {
      globalSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
    }
  } catch {}
}

const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((fn) => fn());
}

export function useSettings(): SettingsContextType {
  const [state, setState] = useState<SiteSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('easypdf_site_settings');
        if (cached) return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
      } catch {}
    }
    return globalSettings;
  });
  const [loading, setLoading] = useState(false);

  const applyBrandingToDom = useCallback((branding: SiteSettings) => {
    if (typeof document === 'undefined') return;

    // Dynamically update favicon
    if (branding.faviconUrl) {
      const iconUrl = branding.faviconUrl.includes('?') 
        ? branding.faviconUrl 
        : `${branding.faviconUrl}?v=${Date.now()}`;
      
      let linkIcon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!linkIcon) {
        linkIcon = document.createElement('link');
        linkIcon.rel = 'icon';
        document.head.appendChild(linkIcon);
      }
      linkIcon.href = iconUrl;

      let linkShortcut = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement | null;
      if (!linkShortcut) {
        linkShortcut = document.createElement('link');
        linkShortcut.rel = 'shortcut icon';
        document.head.appendChild(linkShortcut);
      }
      linkShortcut.href = iconUrl;
    }

    // Dynamically update page title if appName is set
    if (branding.appName && branding.appName !== 'EasyPDF') {
      if (!document.title.includes(branding.appName)) {
        document.title = `${branding.appName} — PDF workspace`;
      }
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/settings?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.settings) {
        globalSettings = data.settings;
        setState(data.settings);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('easypdf_site_settings', JSON.stringify(data.settings));
          } catch {}
        }
        notifySubscribers();
        applyBrandingToDom(data.settings);
      }
    } catch {
      // Maintain defaults
    } finally {
      setLoading(false);
    }
  }, [applyBrandingToDom]);

  useEffect(() => {
    const handler = () => {
      setState({ ...globalSettings });
      applyBrandingToDom(globalSettings);
    };
    subscribers.add(handler);

    // Initial fetch on mount
    refreshSettings();

    return () => {
      subscribers.delete(handler);
    };
  }, [refreshSettings, applyBrandingToDom]);

  return {
    settings: state,
    loading,
    refreshSettings,
  };
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useSettings();
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

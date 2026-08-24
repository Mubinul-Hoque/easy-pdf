'use client';

import React, { useState, useEffect } from 'react';

export interface UserPlanInfo {
  id: string;
  name: string;
  slug: string;
  maxFileSizeMb: number;
  dailyOperationsLimit: number;
  ocrMonthlyPages: number;
}

export interface UserProfile {
  id: string;
  email?: string | null;
  phone?: string | null;
  fullName: string;
  role: 'USER' | 'ADMIN';
  tier: 'ANONYMOUS' | 'FREE' | 'PRO' | 'BUSINESS';
  planId: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt?: string;
  plan?: UserPlanInfo;
}

export interface AuthModalConfig {
  defaultTab: 'phone' | 'email';
  mode: 'register' | 'login';
}

// Shared singleton reactive state
let globalUser: UserProfile | null = null;
let globalLoading = true;
let globalAuthModalOpen = false;
let globalAuthModalConfig: AuthModalConfig = { defaultTab: 'phone', mode: 'register' };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export async function fetchCurrentUser(): Promise<UserProfile | null> {
  try {
    const res = await fetch('/api/auth/me', { headers: { 'Cache-Control': 'no-cache' } });
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated && data.user) {
        globalUser = data.user;
        globalLoading = false;
        notify();
        return data.user;
      }
    }
    globalUser = null;
    globalLoading = false;
    notify();
    return null;
  } catch {
    globalUser = null;
    globalLoading = false;
    notify();
    return null;
  }
}

export function openAuthModal(config?: Partial<AuthModalConfig>) {
  if (config) {
    globalAuthModalConfig = { ...globalAuthModalConfig, ...config };
  }
  globalAuthModalOpen = true;
  notify();
}

export function closeAuthModal() {
  globalAuthModalOpen = false;
  notify();
}

export async function sendOtp(identifier: string, type: 'register' | 'login' = 'register') {
  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, type }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.error?.message || 'Failed to send verification code.',
        error: data.error?.message || 'Failed to send verification code.',
        existingUser: data.existingUser,
        needsRegistration: data.needsRegistration,
      };
    }

    return {
      success: true,
      message: data.message,
      channel: data.channel,
      cooldownSeconds: data.cooldownSeconds,
      demoOtp: data.demoOtp,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error sending verification code.',
      error: err.message || 'Network error.',
    };
  }
}

export async function verifyOtp(
  identifier: string,
  otp: string,
  type: 'register' | 'login' = 'register',
  fullName?: string
) {
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, otp, type, fullName }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error?.message || 'Invalid verification code.',
      };
    }

    if (data.user) {
      globalUser = data.user;
      notify();
      await fetchCurrentUser();
    }

    return {
      success: true,
      message: data.message,
      user: data.user,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error verifying code.',
    };
  }
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {}
  globalUser = null;
  notify();
}

export function useAuth() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleChange = () => setTick((t) => t + 1);
    listeners.add(handleChange);
    if (globalLoading) {
      fetchCurrentUser();
    }
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  return {
    user: globalUser,
    isAuthenticated: !!globalUser,
    loading: globalLoading,
    authModalOpen: globalAuthModalOpen,
    authModalConfig: globalAuthModalConfig,
    openAuthModal,
    closeAuthModal,
    sendOtp,
    verifyOtp,
    logout,
    refreshUser: fetchCurrentUser,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default AuthProvider;

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Layers,
  ChevronDown,
  Sparkles,
  Menu,
  X,
  Grid,
  FileText,
  Combine,
  Scissors,
  RotateCw,
  Minimize2,
  Wrench,
  Search,
  User,
  LogOut,
  Smartphone,
  Mail,
  Zap,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { PDF_TOOLS } from '@/lib/pdf-tools-data';
import { AuthModal } from '@/components/auth/AuthModal';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/context/SettingsContext';

export const Navbar = () => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const organizeTools = PDF_TOOLS.filter((t) => t.category === 'organize');
  const optimizeTools = PDF_TOOLS.filter((t) => t.category === 'optimize');

  const renderToolIcon = (iconName: string) => {
    const iconClass = "h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110";

    switch (iconName) {
      case 'Combine':
      case 'Layers':
        return <Combine className={`${iconClass} text-indigo-500`} />;
      case 'Scissors':
        return <Scissors className={`${iconClass} text-indigo-500`} />;
      case 'RotateCw':
        return <RotateCw className={`${iconClass} text-indigo-500`} />;
      case 'Grid':
        return <Grid className={`${iconClass} text-indigo-500`} />;
      case 'Minimize2':
        return <Minimize2 className={`${iconClass} text-amber-500`} />;
      case 'Wrench':
        return <Wrench className={`${iconClass} text-rose-500`} />;
      case 'Search':
        return <Search className={`${iconClass} text-purple-500`} />;
      default:
        return <FileText className={`${iconClass} text-slate-500`} />;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Do not render consumer website navbar on Admin portal pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <header
        suppressHydrationWarning
        className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl shadow-xs"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 py-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <Link href="/" className="flex items-center gap-3 group">
              {mounted && settings.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logoUrl}
                  alt={settings.appName || 'App Logo'}
                  className="h-11 sm:h-12 max-w-[240px] object-contain group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
                  <Layers className="h-6 w-6" />
                </div>
              )}
              {(!mounted || !settings.logoUrl) && (
                <div className="flex flex-col">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
                    {mounted && settings.appName && settings.appName.toLowerCase() !== 'easypdf' ? (
                      settings.appName
                    ) : (
                      <>
                        Easy<span className="text-indigo-600">PDF</span>
                      </>
                    )}
                  </span>
                </div>
              )}
            </Link>

            {/* Premium PRO Badge for PRO Tier Subscribers */}
            {mounted && isAuthenticated && (user?.tier?.toLowerCase() === 'pro' || user?.tier?.toLowerCase() === 'team') && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white shadow-sm shadow-amber-500/30 border border-amber-400/50">
                <Sparkles className="h-3 w-3 text-amber-200 fill-amber-200 animate-pulse" />
                <span>PRO</span>
              </span>
            )}
          </div>

          {/* Desktop & Tablet Navigation Menu */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {/* All PDF Tools Mega Dropdown */}
            <div
              className="relative"
              ref={toolsMenuRef}
              onMouseEnter={() => setToolsOpen(true)}
              onMouseLeave={() => setToolsOpen(false)}
            >
              <button
                type="button"
                onClick={() => setToolsOpen(!toolsOpen)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all cursor-pointer ${
                  toolsOpen
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-100/80'
                }`}
              >
                <span>All Tools</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    toolsOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* Mega Dropdown Panel with Safe Hover Bridge */}
              {toolsOpen && (
                <div className="absolute left-0 top-full pt-2 w-[460px] z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl backdrop-blur-2xl grid grid-cols-2 gap-4">
                    {/* Column 1: Organize */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2.5 flex items-center gap-1.5 px-2">
                        <Grid className="h-3.5 w-3.5" /> Organize PDF
                      </h4>
                      <div className="space-y-0.5">
                        {organizeTools.map((t) => (
                          <Link
                            key={t.id}
                            href={t.href}
                            onClick={() => setToolsOpen(false)}
                            className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-indigo-50/70 transition-colors"
                          >
                            {renderToolIcon(t.icon)}
                            <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors truncate">
                              {t.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Column 2: Optimize */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2.5 flex items-center gap-1.5 px-2">
                        <Sparkles className="h-3.5 w-3.5" /> Optimize PDF
                      </h4>
                      <div className="space-y-0.5">
                        {optimizeTools.map((t) => (
                          <Link
                            key={t.id}
                            href={t.href}
                            onClick={() => setToolsOpen(false)}
                            className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-amber-50/70 transition-colors"
                          >
                            {renderToolIcon(t.icon)}
                            <span className="text-sm font-medium text-slate-700 group-hover:text-amber-600 transition-colors truncate">
                              {t.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/tools/merge-pdf"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100/80 transition-colors"
            >
              Merge
            </Link>
            <Link
              href="/tools/split-pdf"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100/80 transition-colors"
            >
              Split
            </Link>
            <Link
              href="/tools/organize-pdf"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100/80 transition-colors"
            >
              Organize
            </Link>
            <Link
              href="/tools/rotate-pdf"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100/80 transition-colors"
            >
              Rotate
            </Link>
            <Link
              href="/tools/compress-pdf"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100/80 transition-colors"
            >
              Compress
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100/80 transition-colors"
            >
              Pricing
            </Link>
          </nav>

          {/* Right Action & Authentication Area */}
          <div suppressHydrationWarning className="flex items-center gap-2 sm:gap-2.5">
            {mounted && isAuthenticated && user ? (
              /* Logged In State: User Avatar + Name + Dropdown + Quick Sign Out */
              <div className="flex items-center gap-2">
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-xl p-1.5 pr-2.5 sm:pr-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-xs"
                    title="Your Account Profile"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 text-xs font-bold text-white shadow-sm">
                      {getInitials(user.fullName)}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-900 max-w-[110px] truncate leading-tight">
                        {user.fullName}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider leading-tight">
                        {user.tier} Account
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${
                        userMenuOpen ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Signed In As
                        </div>
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {user.fullName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 truncate">
                          {user.phone ? (
                            <>
                              <Smartphone className="h-3 w-3 text-indigo-500 shrink-0" />
                              <span className="truncate">{user.phone}</span>
                            </>
                          ) : (
                            <>
                              <Mail className="h-3 w-3 text-indigo-500 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                          <Zap className="h-2.5 w-2.5" /> {user.tier} PLAN ACTIVE
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/pricing"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-600 transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          Upgrade Plan & Limits
                        </Link>
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                          <Grid className="h-3.5 w-3.5 text-slate-500" />
                          Admin Portal
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign Out (Log Out)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Quick Sign Out Button */}
                <button
                  type="button"
                  onClick={() => logout()}
                  className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50/60 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              /* Not Logged In: Sign In & Register Buttons (Always visible on all screens) */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAuthModal({ mode: 'login' })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer shadow-2xs"
                >
                  <LogIn className="h-4 w-4 text-indigo-500" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal({ mode: 'register' })}
                  className="inline-flex items-center gap-1.5 justify-center rounded-xl bg-indigo-600 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700 hover:shadow-indigo-500/35 transition-all cursor-pointer"
                >
                  <UserPlus className="h-4 w-4 hidden sm:inline" />
                  <span>Register Free</span>
                </button>
              </div>
            )}

            {/* Mobile & Tablet Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-xl p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 py-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
            {isAuthenticated && user ? (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white">
                    {getInitials(user.fullName)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{user.fullName}</div>
                    <div className="text-xs text-slate-500">{user.phone || user.email}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal({ mode: 'login' });
                  }}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="h-4 w-4 text-indigo-500" />
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal({ mode: 'register' });
                  }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  Register Free
                </button>
              </div>
            )}

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                All PDF Tools
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PDF_TOOLS.map((t) => (
                  <Link
                    key={t.id}
                    href={t.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="group flex items-center gap-2 rounded-xl p-2.5 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
                  >
                    {renderToolIcon(t.icon)}
                    <span className="truncate">{t.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Pricing & Subscription Plans
              </Link>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="block w-full text-center rounded-xl bg-rose-50 py-2.5 text-xs font-bold text-rose-600 border border-rose-200 cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        )}
      </header>
      <AuthModal />
    </>
  );
};

export default Navbar;

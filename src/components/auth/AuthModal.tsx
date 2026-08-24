'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { OtpInput } from './OtpInput';
import {
  X,
  Smartphone,
  Mail,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authModalConfig,
    closeAuthModal,
    sendOtp,
    verifyOtp,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'phone' | 'email'>('phone');
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [step, setStep] = useState<'input' | 'otp'>('input');

  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  // Resend Countdown Timer
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (authModalOpen) {
      setActiveTab(authModalConfig.defaultTab || 'phone');
      setMode(authModalConfig.mode || 'register');
      setStep('input');
      setIdentifier('');
      setFullName('');
      setOtp('');
      setError(null);
      setSuccessMsg(null);
      setDemoOtp(null);
      setCountdown(0);
    }
  }, [authModalOpen, authModalConfig]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!authModalOpen) return null;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const clean = identifier.trim();
    if (!clean) {
      setError(activeTab === 'phone' ? 'Please enter your mobile phone number.' : 'Please enter your email address.');
      return;
    }

    if (mode === 'register' && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(clean, mode);

      if (!res.success) {
        if (res.existingUser) {
          setError(res.message);
          // Suggest switching to sign-in
        } else if (res.needsRegistration) {
          setError(res.message);
          setMode('register');
        } else {
          setError(res.message || res.error || 'Failed to send verification code.');
        }
        setLoading(false);
        return;
      }

      setStep('otp');
      setCountdown(res.cooldownSeconds || 60);
      setSuccessMsg(res.message);
      if (res.demoOtp) {
        setDemoOtp(res.demoOtp);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (submittedOtp?: string) => {
    const codeToVerify = submittedOtp || otp;
    setError(null);

    if (!codeToVerify || codeToVerify.length !== 4) {
      setError('Please enter the full 4-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(identifier.trim(), codeToVerify, mode, fullName.trim());

      if (!res.success) {
        setError(res.error || 'Invalid or expired 4-digit code.');
        setLoading(false);
        return;
      }

      setSuccessMsg(res.message || 'Success! You are now signed in.');
      setTimeout(() => {
        closeAuthModal();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    setOtp('');
    setError(null);
    setLoading(true);
    try {
      const res = await sendOtp(identifier.trim(), mode);
      if (res.success) {
        setCountdown(res.cooldownSeconds || 60);
        setSuccessMsg('A new 4-digit verification code has been sent!');
        if (res.demoOtp) {
          setDemoOtp(res.demoOtp);
        }
      } else {
        setError(res.message || 'Failed to resend code.');
      }
    } catch (err: any) {
      setError(err.message || 'Error resending code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        onClick={closeAuthModal}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-2xl z-10">
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Step 1: Input Details (Register / Login) */}
        {step === 'input' && (
          <div>
            {/* Title & Badge */}
            <div className="text-center mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-inner">
                {activeTab === 'phone' ? (
                  <Smartphone className="h-6 w-6" />
                ) : (
                  <Mail className="h-6 w-6" />
                )}
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {mode === 'register' ? 'Create an Account' : 'Welcome Back'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {mode === 'register'
                  ? 'Register with your mobile phone or email to get started'
                  : 'Sign in to access your saved files and documents'}
              </p>
            </div>

            {/* Identifier Channel Switcher (Phone vs Email) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 mb-5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('phone');
                  setIdentifier('');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'phone'
                    ? 'bg-white text-slate-900 shadow-sm shadow-slate-300/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="h-4 w-4 text-indigo-600" />
                Mobile Phone
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('email');
                  setIdentifier('');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'email'
                    ? 'bg-white text-slate-900 shadow-sm shadow-slate-300/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="h-4 w-4 text-indigo-600" />
                Email Address
              </button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800 animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* Full Name for Registration */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              )}

              {/* Identifier Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  {activeTab === 'phone' ? 'Mobile Phone Number' : 'Email Address'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    {activeTab === 'phone' ? (
                      <Smartphone className="h-4 w-4 text-indigo-500" />
                    ) : (
                      <Mail className="h-4 w-4 text-indigo-500" />
                    )}
                  </div>
                  <input
                    type={activeTab === 'phone' ? 'tel' : 'email'}
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      activeTab === 'phone'
                        ? '+1 234 567 8900 or 01712345678'
                        : 'you@example.com'
                    }
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {activeTab === 'phone'
                    ? 'We will send a 4-digit verification code to this phone number via SMS.'
                    : 'We will send a 4-digit verification code to this email.'}
                </p>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 transition-all duration-200 mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending 4-Digit Code...
                  </>
                ) : (
                  <>
                    Send 4-Digit Verification Code
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Mode Switcher Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              {mode === 'register' ? (
                <p className="text-xs text-slate-500">
                  Already have an EasyPDF account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Sign In
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Don&apos;t have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Create Free Account
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: 4-Digit OTP Verification Screen */}
        {step === 'otp' && (
          <div className="text-center">
            {/* Header Icon */}
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-inner">
              <Lock className="h-6 w-6" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Verify 4-Digit Code
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Please enter the 4-digit code sent to{' '}
              <span className="font-semibold text-slate-800">{identifier}</span>
            </p>

            {/* Change Number/Email link */}
            <button
              type="button"
              onClick={() => {
                setStep('input');
                setError(null);
                setOtp('');
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 mt-1 mb-4"
            >
              <RotateCcw className="h-3 w-3" /> Change {activeTab === 'phone' ? 'phone number' : 'email'}
            </button>

            {/* Status alerts */}
            {error && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800 text-left animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-xs">{error}</div>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* OTP Code Display & Quick-Fill Helper */}
            {demoOtp && (
              <div
                onClick={() => {
                  setOtp(demoOtp);
                  handleVerifyOtp(demoOtp);
                }}
                className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 text-amber-950 text-xs flex items-center justify-between cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] font-semibold text-amber-800">Your 4-Digit OTP Code:</div>
                    <div className="font-mono text-lg font-black tracking-widest text-slate-900 mt-0.5">
                      {demoOtp}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-white border border-indigo-200 px-3 py-1.5 rounded-xl shadow-xs group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                  Auto-Fill & Verify
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            )}

            {/* 4-Digit Segmented OTP Input */}
            <OtpInput
              value={otp}
              onChange={(val) => {
                setOtp(val);
                setError(null);
              }}
              onComplete={(val) => {
                handleVerifyOtp(val);
              }}
              hasError={!!error}
              disabled={loading}
            />

            {/* Resend OTP Timer & Controls */}
            <div className="my-4 text-xs text-slate-500">
              {countdown > 0 ? (
                <p>
                  Resend code in <span className="font-semibold text-slate-700">{countdown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
                >
                  Didn&apos;t receive code? Resend 4-digit OTP
                </button>
              )}
            </div>

            {/* Verification Button */}
            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              disabled={loading || otp.length !== 4}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 transition-all duration-200 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying Code...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Verify & Continue
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;

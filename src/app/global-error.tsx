'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    console.error('Global Application Error:', error);
  }, [error]);

  const handleReload = () => {
    if (typeof reset === 'function') {
      try {
        reset();
        return;
      } catch {
        // Fallback to window reload
      }
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] text-slate-900 px-4 text-center">
        <div className="max-w-md p-8 rounded-3xl bg-white border border-slate-200 shadow-xl">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Application Error</h2>
          <p className="text-xs text-slate-500 mb-4">
            A critical application error occurred.
          </p>
          {error?.message && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-mono text-left break-words max-h-36 overflow-y-auto">
              {error.message}
            </div>
          )}
          <button
            onClick={handleReload}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Reload EasyPDF
          </button>
        </div>
      </body>
    </html>
  );
}

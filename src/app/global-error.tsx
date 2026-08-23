'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] text-slate-900 px-4 text-center">
        <div className="max-w-md p-8 rounded-3xl bg-white border border-slate-200 shadow-xl">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Application Error</h2>
          <p className="text-xs text-slate-500 mb-6">
            A critical application error occurred. Please reload the page. If the issue persists, contact support.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-colors"
          >
            Reload EasyPDF
          </button>
        </div>
      </body>
    </html>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { JobProgress, ProcessedResult } from '@/lib/types';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  FileCheck,
  HardDrive,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  triggerFileDownload,
  triggerBatchDownload,
  requestServerFileCleanup,
} from '@/lib/download-manager';
import { formatBytes } from '@/lib/format-utils';
import { BackgroundTaskManager } from '@/lib/background-task-manager';

interface ProcessingModalProps {
  progress: JobProgress;
  onReset: () => void;
  title?: string;
  onDownloadComplete?: (result: ProcessedResult) => void;
}

const ProcessingModalComponent: React.FC<ProcessingModalProps> = ({
  progress,
  onReset,
  title = 'Processing Document',
  onDownloadComplete,
}) => {
  const [downloadStatus, setDownloadStatus] = useState<
    'idle' | 'downloading' | 'completed' | 'failed'
  >('idle');
  const [storageCleaned, setStorageCleaned] = useState(false);
  const downloadedRef = useRef(false);
  const originalTitleRef = useRef<string>('');

  // Background Task Keep-Alive & Dynamic Tab Title
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title;
    }

    if (progress.status === 'processing' || progress.status === 'uploading') {
      BackgroundTaskManager.startKeepAlive();
      document.title = `[${progress.percent}%] ${progress.message || 'Processing...'} — EasyPDF`;
    } else if (progress.status === 'completed') {
      BackgroundTaskManager.stopKeepAlive();
      document.title = `✅ Completed! — EasyPDF`;
    } else {
      BackgroundTaskManager.stopKeepAlive();
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    }

    return () => {
      if (progress.status === 'processing' || progress.status === 'uploading') {
        BackgroundTaskManager.stopKeepAlive();
      }
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    };
  }, [progress.status, progress.percent, progress.message]);

  // Auto-Download on Completion & Subsequent Server Storage Cleanup
  useEffect(() => {
    if (progress.status === 'completed' && progress.result && !downloadedRef.current) {
      downloadedRef.current = true;
      setDownloadStatus('downloading');

      const handleAutoDownloadAndCleanup = async () => {
        try {
          const result = progress.result!;
          let success = false;

          if (result.additionalFiles && result.additionalFiles.length > 0) {
            // Batch sequential auto-download
            const allFiles = [
              { downloadUrl: result.downloadUrl, fileName: result.fileName },
              ...result.additionalFiles,
            ];
            success = await triggerBatchDownload(allFiles);
          } else {
            // Single file auto-download
            success = await triggerFileDownload(result.downloadUrl, result.fileName);
          }

          if (success) {
            setDownloadStatus('completed');
            // Delete source and generated files from server storage only after download completes
            await requestServerFileCleanup({
              jobId: result.jobId,
              fileIds: result.fileIds,
            });
            setStorageCleaned(true);
            onDownloadComplete?.(result);
          } else {
            setDownloadStatus('failed');
          }
        } catch (err) {
          console.error('Auto download/cleanup pipeline error:', err);
          setDownloadStatus('failed');
        }
      };

      // Slight timeout to let the completion modal transition render smoothly
      const timer = setTimeout(handleAutoDownloadAndCleanup, 250);
      return () => clearTimeout(timer);
    }
  }, [progress.status, progress.result, onDownloadComplete]);

  // Reset local state on progress reset
  useEffect(() => {
    if (progress.status === 'idle') {
      downloadedRef.current = false;
      setDownloadStatus('idle');
      setStorageCleaned(false);
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    }
  }, [progress.status]);

  if (progress.status === 'idle') return null;

  const formatSize = (bytes?: number) => formatBytes(bytes, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
        {/* 1. PROCESSING STATE */}
        {(progress.status === 'uploading' || progress.status === 'processing') && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 mb-6">{progress.message || 'Analyzing and rendering document streams...'}</p>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-3 border border-slate-200">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-indigo-600">{progress.percent}% Completed</span>
          </div>
        )}

        {/* 2. COMPLETED STATE */}
        {progress.status === 'completed' && progress.result && (
          <div className="flex flex-col items-center text-center py-4">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-md shadow-emerald-500/10">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mb-1">
              {downloadStatus === 'completed' ? 'Downloaded to Device!' : 'Processing Complete!'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              {downloadStatus === 'completed'
                ? 'Your file was automatically downloaded to your downloads folder.'
                : 'Starting automatic download to your device...'}
            </p>

            {/* Auto-Download & Storage Status Notification Banner */}
            <div className="w-full mb-4 flex flex-col gap-2">
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Auto-Download: {downloadStatus === 'completed' ? 'Saved to Device' : 'Initiating...'}</span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  100% Done
                </span>
              </div>

              {storageCleaned && (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
                  <span className="truncate">Server storage purged • Zero file retention</span>
                </div>
              )}
            </div>

            {/* Results Card */}
            <div className="w-full rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-5 text-left space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-indigo-600" /> File Name
                </span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={progress.result.fileName}>
                  {progress.result.fileName}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <HardDrive className="h-4 w-4 text-indigo-600" /> Output Size
                </span>
                <span className="font-bold text-emerald-600">{formatSize(progress.result.fileSizeBytes)}</span>
              </div>

              {progress.result.originalSizeBytes && progress.result.originalSizeBytes > progress.result.fileSizeBytes && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" /> Size Reduction
                  </span>
                  <span className="font-bold text-indigo-600">
                    Saved{' '}
                    {Math.round(
                      (1 - progress.result.fileSizeBytes / progress.result.originalSizeBytes) * 100
                    )}
                    %
                  </span>
                </div>
              )}
            </div>

            {/* Manual Re-Download Button */}
            <a
              href={progress.result.downloadUrl}
              download={progress.result.fileName}
              onClick={() => {
                // Secondary backup cleanup request
                requestServerFileCleanup({
                  jobId: progress.result?.jobId,
                  fileIds: progress.result?.fileIds,
                });
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 px-6 text-xs font-bold transition-all duration-200 mb-2 border border-slate-200"
            >
              <Download className="h-4 w-4 text-indigo-600" />
              Download Again ({progress.result.fileName})
            </a>

            <button
              onClick={onReset}
              className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 py-2 transition-colors font-medium"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Process another document
            </button>
          </div>
        )}

        {/* 3. ERROR STATE */}
        {progress.status === 'error' && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 border border-red-200 text-red-600">
              <AlertCircle className="h-8 w-8" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mb-2">Processing Error</h3>
            <p className="text-sm text-red-700 mb-6 bg-red-50 border border-red-200 rounded-xl p-3.5 w-full">
              {progress.error || 'An unexpected error occurred while processing this document.'}
            </p>

            <button
              onClick={onReset}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 px-6 text-sm font-semibold text-white hover:bg-slate-800 transition-colors w-full"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const ProcessingModal = React.memo(ProcessingModalComponent);


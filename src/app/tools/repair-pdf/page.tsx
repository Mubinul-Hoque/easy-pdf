'use client';

import React, { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { PDFPreviewFrame } from '@/components/PDFPreviewFrame';
import { PDFEngine } from '@/lib/pdf-engine';
import { JobProgress } from '@/lib/types';
import { useToolConfig } from '@/context/ToolsContext';
import { checkUsageQuota, trackUsageCompletion } from '@/lib/usage-client';
import { Wrench, Sparkles, FileText, ShieldAlert, AlertCircle } from 'lucide-react';

export default function RepairPDFPage() {
  const toolConfig = useToolConfig('repair-pdf');
  const [file, setFile] = useState<File | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const [progress, setProgress] = useState<JobProgress>({
    status: 'idle',
    percent: 0,
    message: '',
  });

  const handleFileSelected = (files: File[]) => {
    if (files.length > 0) {
      const selected = files[0];
      setSizeError(null);

      if (selected.size > toolConfig.maxSizeBytes) {
        setSizeError(
          `"${selected.name}" exceeds the maximum allowed file size of ${toolConfig.formattedMaxSize}.`
        );
        return;
      }

      setFile(selected);
    }
  };

  const handleRepair = async () => {
    if (!file) return;

    const startedAt = Date.now();

    try {
      const quota = await checkUsageQuota('repair');
      if (!quota.allowed) {
        setProgress({
          status: 'error',
          percent: 0,
          message: 'Daily limit reached',
          error: quota.message || 'You have reached your daily operations limit.',
        });
        return;
      }

      setProgress({
        status: 'processing',
        percent: 25,
        message: 'Scanning binary byte stream for damaged xref tables...',
      });

      const buffer = await file.arrayBuffer();
      const outputName = `repaired_${file.name}`;

      setProgress({
        status: 'processing',
        percent: 65,
        message: 'Rebuilding catalog dictionaries and object references...',
      });

      const result = await PDFEngine.repairPDF(buffer, outputName);

      trackUsageCompletion({
        action: 'repair',
        files: [{ name: file.name, size: file.size }],
        durationMs: Date.now() - startedAt,
      });

      setProgress({
        status: 'completed',
        percent: 100,
        message: 'PDF repaired and structure normalized!',
        result,
      });
    } catch (err: any) {
      console.error(err);
      setProgress({
        status: 'error',
        percent: 0,
        message: 'Repair failed',
        error:
          err.message ||
          'The document is too severely damaged or encrypted without a master key.',
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-red-600 text-white shadow-md shadow-rose-500/20 mb-4">
          <Wrench className="h-6 w-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">Repair PDF File</h1>
        <p className="text-slate-600 text-base max-w-xl mx-auto">
          Recover data from corrupted, damaged, or unreadable PDF files. Rebuild cross-reference tables and recover lost pages.
        </p>
      </div>

      {/* Tool Maintenance Warning */}
      {!toolConfig.isEnabled && (
        <div className="max-w-3xl mx-auto mb-6 flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold">
          <Wrench className="h-5 w-5 text-amber-600 shrink-0" />
          <span>This tool is temporarily in maintenance mode as set by administrators.</span>
        </div>
      )}

      {/* Size error message */}
      {sizeError && (
        <div className="max-w-3xl mx-auto mb-6 flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{sizeError}</span>
        </div>
      )}

      {/* Main Workspace */}
      {!file ? (
        <div className="max-w-3xl mx-auto">
          <DropZone
            onFilesSelected={handleFileSelected}
            multiple={false}
            maxSizeMB={toolConfig.maxFileSizeMb}
            title="Select Corrupted PDF to Repair"
            subtitle="or drop a damaged PDF file here"
            badge={`Structural Recovery Engine • Files up to ${toolConfig.formattedMaxSize}`}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Settings */}
          <div className="lg:col-span-5 space-y-6">
            {/* File Card */}
            <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>

              <button
                onClick={() => setFile(null)}
                className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                Change
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                <p>
                  The repair engine scans low-level trailer pointers, unreadable cross-reference tables, and orphaned stream objects to restore document integrity.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                <p className="font-bold text-slate-900">Recovery Steps:</p>
                <ul className="space-y-1 list-disc list-inside text-slate-600">
                  <li>XREF cross-reference table reconstruction</li>
                  <li>Font dictionary repair & stream normalization</li>
                  <li>Page tree hierarchy healing</li>
                </ul>
              </div>

              <button
                onClick={handleRepair}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3.5 px-6 text-sm font-bold text-white shadow-md shadow-rose-500/20 hover:bg-rose-700 transition-all duration-200"
              >
                <Sparkles className="h-4 w-4" />
                Scan & Repair PDF
              </button>
            </div>
          </div>

          {/* Right Column: PDF Preview Frame */}
          <div className="lg:col-span-7 sticky top-24">
            <PDFPreviewFrame
              file={file}
              height="580px"
              badge="Damaged File Inspection"
            />
          </div>
        </div>
      )}

      {/* Processing Modal */}
      <ProcessingModal
        progress={progress}
        onReset={() => {
          setProgress({ status: 'idle', percent: 0, message: '' });
          setFile(null);
        }}
        title="Repairing Damaged PDF"
      />
    </div>
  );
}

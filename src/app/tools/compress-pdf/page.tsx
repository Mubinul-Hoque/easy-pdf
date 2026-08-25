'use client';

import React, { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { PDFPreviewFrame } from '@/components/PDFPreviewFrame';
import { PDFEngine } from '@/lib/pdf-engine';
import { CompressionLevel, JobProgress } from '@/lib/types';
import {
  Minimize2,
  Sparkles,
  FileText,
  Trash2,
  Plus,
  Layers,
  Archive,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { useToolConfig } from '@/context/ToolsContext';
import { AlertCircle, Wrench } from 'lucide-react';

interface FileWithMeta {
  file: File;
  pageCount: number;
  sizeBytes: number;
}

export default function CompressPDFPage() {
  const toolConfig = useToolConfig('compress-pdf');
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [level, setLevel] = useState<CompressionLevel>('balanced');
  const [exportMode, setExportMode] = useState<'zip' | 'individual'>('zip');
  const [batchLimitError, setBatchLimitError] = useState<string | null>(null);

  const [progress, setProgress] = useState<JobProgress>({
    status: 'idle',
    percent: 0,
    message: '',
  });

  const handleFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setBatchLimitError(null);

    // Enforce configured max file size
    const validFiles: File[] = [];
    for (const f of newFiles) {
      if (f.size > toolConfig.maxSizeBytes) {
        setBatchLimitError(
          `"${f.name}" (${(f.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed file size of ${toolConfig.formattedMaxSize}.`
        );
      } else {
        validFiles.push(f);
      }
    }

    if (validFiles.length === 0) return;

    // Enforce configured batch file limit
    const totalCount = files.length + validFiles.length;
    let allowedFiles = validFiles;
    if (totalCount > toolConfig.batchLimit) {
      const remainingQuota = Math.max(0, toolConfig.batchLimit - files.length);
      allowedFiles = validFiles.slice(0, remainingQuota);
      setBatchLimitError(
        `Batch limit reached: Maximum ${toolConfig.batchLimit} files allowed per batch.`
      );
    }

    if (allowedFiles.length === 0) return;

    const loadedMetas: FileWithMeta[] = [];
    for (const f of allowedFiles) {
      try {
        const buffer = await f.arrayBuffer();
        const safeData = new Uint8Array(buffer).slice();
        const doc = await PDFDocument.load(safeData, { ignoreEncryption: true });
        loadedMetas.push({
          file: f,
          pageCount: doc.getPageCount(),
          sizeBytes: f.size,
        });
      } catch (err) {
        console.warn('PDF load warning for metadata:', err);
        loadedMetas.push({
          file: f,
          pageCount: 1,
          sizeBytes: f.size,
        });
      }
    }

    setFiles((prev) => [...prev, ...loadedMetas]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (activePreviewIndex >= next.length) {
        setActivePreviewIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const handleCompress = async () => {
    if (files.length === 0) return;

    try {
      setProgress({
        status: 'processing',
        percent: 10,
        message: `Analyzing ${files.length} document${files.length > 1 ? 's' : ''}...`,
      });

      const fileBuffers: Array<{ name: string; buffer: ArrayBuffer }> = [];
      for (let i = 0; i < files.length; i++) {
        const buf = await files[i].file.arrayBuffer();
        fileBuffers.push({
          name: files[i].file.name,
          buffer: buf,
        });
      }

      const result = await PDFEngine.compressBulkPDFs(
        fileBuffers,
        level,
        exportMode,
        (percent, msg) => {
          setProgress((prev) => ({
            ...prev,
            status: 'processing',
            percent,
            message: msg,
          }));
        }
      );

      setProgress({
        status: 'completed',
        percent: 100,
        message:
          files.length === 1
            ? 'PDF successfully compressed & optimized!'
            : `Successfully compressed ${files.length} PDF files!`,
        result,
      });
    } catch (err: any) {
      console.error('Bulk compression error:', err);
      setProgress({
        status: 'error',
        percent: 0,
        message: 'Compression failed',
        error: err.message || 'Failed to compress PDF files.',
      });
    }
  };

  const totalOriginalBytes = files.reduce((acc, curr) => acc + curr.sizeBytes, 0);
  const totalOriginalMB = (totalOriginalBytes / (1024 * 1024)).toFixed(2);
  const totalPages = files.reduce((acc, curr) => acc + curr.pageCount, 0);

  const estimatedFactor = level === 'max' ? 0.20 : level === 'balanced' ? 0.50 : 0.75;
  const estimatedSavingsPercent = level === 'max' ? '~80%' : level === 'balanced' ? '~50%' : '~25%';
  const estimatedOutputMB = (parseFloat(totalOriginalMB) * estimatedFactor).toFixed(2);

  const activeFile = files[activePreviewIndex]?.file || null;
  const activePageCount = files[activePreviewIndex]?.pageCount || 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20 mb-4">
          <Minimize2 className="h-6 w-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
          Compress PDF Document
        </h1>
        <p className="text-slate-600 text-base max-w-xl mx-auto">
          Reduce file size for single PDF documents or bulk process multiple files at once while maintaining crisp visual quality.
        </p>
      </div>

      {/* Tool Maintenance Warning */}
      {!toolConfig.isEnabled && (
        <div className="max-w-3xl mx-auto mb-6 flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold">
          <Wrench className="h-5 w-5 text-amber-600 shrink-0" />
          <span>This tool is temporarily in maintenance mode as set by administrators. You may still preview features below.</span>
        </div>
      )}

      {/* Quota error message if any */}
      {batchLimitError && (
        <div className="max-w-3xl mx-auto mb-6 flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{batchLimitError}</span>
        </div>
      )}

      {/* Main Workspace */}
      {files.length === 0 ? (
        <div className="max-w-3xl mx-auto">
          <DropZone
            onFilesSelected={handleFilesSelected}
            multiple={true}
            maxSizeMB={toolConfig.maxFileSizeMb}
            title="Select PDF to Compress"
            subtitle="or drop a single PDF or multiple files here"
            badge={`Up to 90% Size Reduction • Single & Batch Mode • Files up to ${toolConfig.formattedMaxSize}`}
            buttonLabel="Choose PDF File(s)"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: File List & Compression Settings */}
          <div className="lg:col-span-5 space-y-6">
            {/* Batch Summary Header */}
            <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {files.length === 1 ? '1 Document Selected' : `${files.length} Documents Selected`}
                  </span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {files.length === 1 ? 'Single File Mode' : 'Bulk Batch Mode'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {totalPages} total page{totalPages === 1 ? '' : 's'} • {totalOriginalMB} MB total size
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCompress}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {files.length === 1 ? 'Compress PDF' : 'Compress All'}
                </button>

                <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  Add More
                  <input
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFilesSelected(Array.from(e.target.files));
                      }
                    }}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => setFiles([])}
                  className="text-xs text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors"
                  title="Clear all files"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable File Cards List */}
            <div className="rounded-2xl bg-slate-50/70 border border-slate-200 p-2 max-h-[220px] overflow-y-auto space-y-1.5 custom-scrollbar">
              {files.map((item, idx) => (
                <div
                  key={`${item.file.name}_${idx}`}
                  onClick={() => setActivePreviewIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    activePreviewIndex === idx
                      ? 'bg-white border-amber-400 shadow-sm ring-2 ring-amber-400/20'
                      : 'bg-white/80 border-slate-200/80 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 flex-shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-xs truncate max-w-[170px]" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {item.pageCount} pages • {(item.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {activePreviewIndex === idx && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                        Previewing
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(idx);
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Compression Level Selector Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Select Compression Level</h3>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                  Est. Reduction: {estimatedSavingsPercent}
                </span>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => setLevel('low')}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all ${
                    level === 'low'
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-900 text-xs">Low Compression (High Quality)</h4>
                    <span className="text-[10px] font-bold text-slate-500">~20% reduction</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Subtle size optimization preserving fine vector details.</p>
                </button>

                <button
                  onClick={() => setLevel('balanced')}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all relative ${
                    level === 'balanced'
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-xs">Balanced Compression</h4>
                      <span className="rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 border border-indigo-200">
                        Recommended
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600">~50% reduction</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Optimal balance between crisp typography and compact file size.</p>
                </button>

                <button
                  onClick={() => setLevel('max')}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all ${
                    level === 'max'
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-900 text-xs">Extreme Compression</h4>
                    <span className="text-[10px] font-bold text-amber-600">~80% reduction</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Aggressive compression for low-bandwidth sharing and tight limits.</p>
                </button>
              </div>

              {/* Multi-file Export Option (if more than 1 file) */}
              {files.length > 1 && (
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <label className="text-xs font-bold text-slate-800 block">Batch Export Format:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setExportMode('zip')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        exportMode === 'zip'
                          ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Archive className="h-3.5 w-3.5 text-amber-600" />
                        <span className="font-bold text-slate-900 text-xs">ZIP Archive</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">Single compressed archive</span>
                    </button>

                    <button
                      onClick={() => setExportMode('individual')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        exportMode === 'individual'
                          ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Layers className="h-3.5 w-3.5 text-amber-600" />
                        <span className="font-bold text-slate-900 text-xs">Individual PDFs</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">Sequential downloads</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Estimated Batch Savings Card */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">Estimated Result</span>
                    <span className="text-[11px] text-slate-600">
                      ~{estimatedOutputMB} MB Total (from {totalOriginalMB} MB)
                    </span>
                  </div>
                </div>
                <span className="font-extrabold text-amber-700 bg-amber-100/80 px-2 py-1 rounded-md text-xs">
                  {estimatedSavingsPercent}
                </span>
              </div>

              {/* Action Button */}
              <button
                onClick={handleCompress}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 px-6 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all duration-200"
              >
                <Sparkles className="h-4 w-4" />
                {files.length === 1
                  ? 'Compress PDF & Download'
                  : `Compress All ${files.length} Files & Download`}
              </button>
            </div>
          </div>

          {/* Right Column: PDF Preview Frame */}
          <div className="lg:col-span-7 sticky top-24">
            {activeFile ? (
              <PDFPreviewFrame
                file={activeFile}
                pageCount={activePageCount}
                height="580px"
                badge={`Previewing: ${activeFile.name} (${(activeFile.size / (1024 * 1024)).toFixed(2)} MB)`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm min-h-[580px]">
                <FileText className="h-10 w-10 text-slate-400 mb-3" />
                <p className="text-sm font-bold text-slate-700">No Document Selected</p>
                <p className="text-xs text-slate-500">Select a file from the list to preview</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing Modal with Auto-Download & Storage Cleanup */}
      <ProcessingModal
        progress={progress}
        onReset={() => {
          setProgress({ status: 'idle', percent: 0, message: '' });
          setFiles([]);
          setActivePreviewIndex(0);
        }}
        title="Compressing PDF Documents"
      />
    </div>
  );
}

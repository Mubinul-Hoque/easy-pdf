'use client';

import React, { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { PDFPreviewFrame } from '@/components/PDFPreviewFrame';
import { PDFEngine } from '@/lib/pdf-engine';
import { JobProgress } from '@/lib/types';
import { useToolConfig } from '@/context/ToolsContext';
import { Scissors, Sparkles, FileText, Settings, AlertCircle, Wrench } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export default function SplitPDFPage() {
  const toolConfig = useToolConfig('split-pdf');
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [splitMode, setSplitMode] = useState<'ranges' | 'chunks'>('ranges');
  const [rangeInput, setRangeInput] = useState('1-2, 3-4');
  const [chunkEvery, setChunkEvery] = useState(2);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const [progress, setProgress] = useState<JobProgress>({
    status: 'idle',
    percent: 0,
    message: '',
  });

  const handleFileSelected = async (files: File[]) => {
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
      try {
        const buffer = await selected.arrayBuffer();
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const count = doc.getPageCount();
        setPageCount(count);
        if (count >= 4) {
          setRangeInput(`1-${Math.floor(count / 2)}, ${Math.floor(count / 2) + 1}-${count}`);
        } else {
          setRangeInput(`1-${count}`);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSplit = async () => {
    if (!file) return;

    try {
      setProgress({
        status: 'processing',
        percent: 30,
        message: 'Parsing page ranges and structural markers...',
      });

      const buffer = await file.arrayBuffer();
      const baseName = file.name.replace(/\.[^/.]+$/, '');

      setProgress({
        status: 'processing',
        percent: 70,
        message: 'Extracting split PDF streams and packaging archive...',
      });

      const result = await PDFEngine.splitPDF(
        buffer,
        splitMode,
        {
          ranges: rangeInput,
          chunkEvery: Number(chunkEvery),
        },
        baseName
      );

      setProgress({
        status: 'completed',
        percent: 100,
        message: 'Split completed successfully!',
        result,
      });
    } catch (err: any) {
      console.error(err);
      setProgress({
        status: 'error',
        percent: 0,
        message: 'Split failed',
        error: err.message || 'Failed to split document.',
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 mb-4">
          <Scissors className="h-6 w-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">Split PDF Document</h1>
        <p className="text-slate-600 text-base max-w-xl mx-auto">
          Extract specific pages or separate your document into individual PDF files by custom page ranges with live visual verification.
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
            title="Select PDF file to Split"
            subtitle="or drop a PDF file here"
            badge={`Extract or Split Pages • Files up to ${toolConfig.formattedMaxSize}`}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Settings & Controls */}
          <div className="lg:col-span-5 space-y-6">
            {/* File Overview Card */}
            <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {pageCount} total {pageCount === 1 ? 'page' : 'pages'} • {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <button
                onClick={() => setFile(null)}
                className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                Change
              </button>
            </div>

            {/* Split Configuration Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <Settings className="h-4 w-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Split Mode & Range Settings</h3>
              </div>

              {/* Split Mode Selector */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSplitMode('ranges')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    splitMode === 'ranges'
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <h4 className="font-bold text-slate-900 text-xs mb-1">Page Ranges</h4>
                  <p className="text-[11px] text-slate-500">Groupings like &quot;1-2, 3-5&quot;</p>
                </button>

                <button
                  onClick={() => setSplitMode('chunks')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    splitMode === 'chunks'
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <h4 className="font-bold text-slate-900 text-xs mb-1">Fixed Chunks</h4>
                  <p className="text-[11px] text-slate-500">Split every N pages</p>
                </button>
              </div>

              {/* Mode-Specific Input */}
              {splitMode === 'ranges' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Page Ranges (Total: {pageCount} pages)
                  </label>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder="e.g. 1-2, 3-4"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-2">
                    Example: <span className="text-indigo-600 font-mono font-bold">1-2, 3-4</span> splits into 2 documents.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Split every N pages
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, pageCount)}
                    value={chunkEvery}
                    onChange={(e) => setChunkEvery(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                  />
                </div>
              )}

              {/* Split Trigger Button */}
              <button
                onClick={handleSplit}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 px-6 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all duration-200"
              >
                <Sparkles className="h-4 w-4" />
                Split PDF & Download Archive
              </button>
            </div>
          </div>

          {/* Right Column: PDF Preview Frame */}
          <div className="lg:col-span-7 sticky top-24">
            <PDFPreviewFrame
              file={file}
              pageCount={pageCount}
              highlightRanges={splitMode === 'ranges' ? rangeInput : undefined}
              height="580px"
              badge={splitMode === 'ranges' ? 'Range Split Mode' : `Every ${chunkEvery} pages`}
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
        title="Splitting PDF Document"
      />
    </div>
  );
}

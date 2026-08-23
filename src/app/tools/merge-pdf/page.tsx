'use client';

import React, { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { PDFPreviewFrame } from '@/components/PDFPreviewFrame';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';
import { PDFEngine } from '@/lib/pdf-engine';
import { JobProgress } from '@/lib/types';
import { Layers, Trash2, ArrowUp, ArrowDown, Plus, Sparkles, FileText, Eye, CheckCircle2 } from 'lucide-react';

export default function MergePDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [modalPreviewFile, setModalPreviewFile] = useState<File | null>(null);

  const [progress, setProgress] = useState<JobProgress>({
    status: 'idle',
    percent: 0,
    message: '',
  });

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (activePreviewIndex >= updated.length) {
        setActivePreviewIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const moveFile = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    setFiles((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
    if (activePreviewIndex === from) {
      setActivePreviewIndex(to);
    }
  };

  const handleMerge = async () => {
    if (files.length < 2) return;

    try {
      setProgress({
        status: 'processing',
        percent: 25,
        message: 'Reading PDF documents into memory buffer...',
      });

      const buffers: ArrayBuffer[] = [];
      for (let i = 0; i < files.length; i++) {
        buffers.push(await files[i].arrayBuffer());
        setProgress({
          status: 'processing',
          percent: 25 + Math.round(((i + 1) / files.length) * 35),
          message: `Loaded file ${i + 1} of ${files.length}...`,
        });
      }

      setProgress({
        status: 'processing',
        percent: 75,
        message: 'Merging pages, bookmarks, and catalog streams...',
      });

      const result = await PDFEngine.mergePDFs(buffers, 'merged_document.pdf');

      setProgress({
        status: 'completed',
        percent: 100,
        message: 'Merge successful!',
        result,
      });
    } catch (err: any) {
      console.error(err);
      setProgress({
        status: 'error',
        percent: 0,
        message: 'Merge failed',
        error: err.message || 'Failed to merge documents.',
      });
    }
  };

  const formatSize = (bytes: number) => {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const activeFile = files[activePreviewIndex] || null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 mb-4">
          <Layers className="h-6 w-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">Merge PDF Files</h1>
        <p className="text-slate-600 text-base max-w-xl mx-auto">
          Combine multiple PDF files into one single document. Drag or use arrows to reorder, inspect with live preview, and merge in seconds.
        </p>
      </div>

      {/* Main Workspace */}
      {files.length === 0 ? (
        <div className="max-w-3xl mx-auto">
          <DropZone
            onFilesSelected={handleFilesSelected}
            multiple={true}
            title="Select PDF files to Merge"
            subtitle="or drop 2 or more PDF files here"
            badge="Combine multiple PDFs"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Reorderable List & Controls */}
          <div className="lg:col-span-5 space-y-6">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div>
                <span className="text-sm font-bold text-slate-900 block">
                  {files.length} {files.length === 1 ? 'File' : 'Files'} selected
                </span>
                <span className="text-xs text-slate-500">
                  {files.length < 2 ? 'Add at least 1 more file' : 'Ready to combine in listed order'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  Add more
                  <input
                    type="file"
                    multiple
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Reorderable File List */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {files.map((file, index) => {
                const isSelected = index === activePreviewIndex;
                return (
                  <div
                    key={`${file.name}-${index}`}
                    onClick={() => setActivePreviewIndex(index)}
                    className={`flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold text-xs border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-xs sm:text-sm truncate max-w-[160px] sm:max-w-[200px]">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-500">{formatSize(file.size)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setModalPreviewFile(file)}
                        title="Expand Full Preview"
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moveFile(index, index - 1)}
                        disabled={index === 0}
                        title="Move Up"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveFile(index, index + 1)}
                        disabled={index === files.length - 1}
                        title="Move Down"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeFile(index)}
                        title="Remove File"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Merge Action Button */}
            <button
              onClick={handleMerge}
              disabled={files.length < 2}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 px-6 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Merge {files.length} PDFs into One Document
            </button>
          </div>

          {/* Right Column: Live Preview Frame of Selected File in sequence */}
          <div className="lg:col-span-7 sticky top-24">
            <PDFPreviewFrame
              file={activeFile}
              height="580px"
              badge={activeFile ? `File ${activePreviewIndex + 1} of ${files.length}` : undefined}
            />
          </div>
        </div>
      )}

      {/* Modal for popout inspection */}
      <PDFPreviewModal
        isOpen={!!modalPreviewFile}
        onClose={() => setModalPreviewFile(null)}
        file={modalPreviewFile}
      />

      {/* Progress & Results Modal */}
      <ProcessingModal
        progress={progress}
        onReset={() => {
          setProgress({ status: 'idle', percent: 0, message: '' });
          setFiles([]);
        }}
        title="Merging PDF Documents"
      />
    </div>
  );
}

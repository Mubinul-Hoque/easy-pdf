'use client';

import React, { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { PDFPreviewFrame } from '@/components/PDFPreviewFrame';
import { PDFEngine } from '@/lib/pdf-engine';
import { JobProgress } from '@/lib/types';
import { RotateCw, RotateCcw, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export default function RotatePDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [targetPages, setTargetPages] = useState<'all' | 'odd' | 'even'>('all');

  const [progress, setProgress] = useState<JobProgress>({
    status: 'idle',
    percent: 0,
    message: '',
  });

  const handleFileSelected = async (files: File[]) => {
    if (files.length > 0) {
      const selected = files[0];
      setFile(selected);
      setRotationAngle(0);
      try {
        const buffer = await selected.arrayBuffer();
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        setPageCount(doc.getPageCount());
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRotate = async () => {
    if (!file) return;

    try {
      setProgress({
        status: 'processing',
        percent: 30,
        message: 'Updating page rotation matrices...',
      });

      const buffer = await file.arrayBuffer();

      setProgress({
        status: 'processing',
        percent: 70,
        message: 'Writing updated PDF dictionary streams...',
      });

      const result = await PDFEngine.rotatePDF(
        buffer,
        rotationAngle,
        targetPages,
        `rotated_${file.name}`
      );

      setProgress({
        status: 'completed',
        percent: 100,
        message: 'Rotation applied successfully!',
        result,
      });
    } catch (err: any) {
      console.error(err);
      setProgress({
        status: 'error',
        percent: 0,
        message: 'Rotation failed',
        error: err.message || 'Failed to rotate document.',
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/20 mb-4">
          <RotateCw className="h-6 w-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">Rotate PDF Pages</h1>
        <p className="text-slate-600 text-base max-w-xl mx-auto">
          Rotate your PDF pages 90, 180, or 270 degrees. Apply to all pages or selectively to odd/even pages with live real-time preview.
        </p>
      </div>

      {/* Main Workspace */}
      {!file ? (
        <div className="max-w-3xl mx-auto">
          <DropZone
            onFilesSelected={handleFileSelected}
            multiple={false}
            title="Select PDF file to Rotate"
            subtitle="or drop a PDF file here"
            badge="Live Orientation Preview"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Settings & Actions */}
          <div className="lg:col-span-5 space-y-6">
            {/* File Overview Card */}
            <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
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

            {/* Rotation Options */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900 text-sm">1. Select Rotation Angle</h3>
                  <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200">
                    {rotationAngle === 0 ? '0° (Original)' : `+${rotationAngle}°`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setRotationAngle(0)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      rotationAngle === 0
                        ? 'border-indigo-500 bg-indigo-50/70 shadow-sm text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <FileText className="h-4 w-4 mb-1 text-slate-600" />
                    <span className="text-xs font-bold">0°</span>
                    <span className="text-[9px] text-slate-500">Original</span>
                  </button>

                  <button
                    onClick={() => setRotationAngle(90)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      rotationAngle === 90
                        ? 'border-indigo-500 bg-indigo-50/70 shadow-sm text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <RotateCw className="h-4 w-4 mb-1 text-indigo-600" />
                    <span className="text-xs font-bold">+90°</span>
                    <span className="text-[9px] text-slate-500">Right</span>
                  </button>

                  <button
                    onClick={() => setRotationAngle(180)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      rotationAngle === 180
                        ? 'border-indigo-500 bg-indigo-50/70 shadow-sm text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <RotateCw className="h-4 w-4 mb-1 text-purple-600 rotate-90" />
                    <span className="text-xs font-bold">180°</span>
                    <span className="text-[9px] text-slate-500">Invert</span>
                  </button>

                  <button
                    onClick={() => setRotationAngle(270)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      rotationAngle === 270
                        ? 'border-indigo-500 bg-indigo-50/70 shadow-sm text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <RotateCcw className="h-4 w-4 mb-1 text-pink-600" />
                    <span className="text-xs font-bold">+270°</span>
                    <span className="text-[9px] text-slate-500">Left</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-3">2. Target Pages</h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTargetPages('all')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      targetPages === 'all'
                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    All Pages ({pageCount})
                  </button>

                  <button
                    onClick={() => setTargetPages('odd')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      targetPages === 'odd'
                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Odd Pages
                  </button>

                  <button
                    onClick={() => setTargetPages('even')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      targetPages === 'even'
                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Even Pages
                  </button>
                </div>
              </div>

              {/* Trigger Button */}
              <button
                onClick={handleRotate}
                disabled={rotationAngle === 0}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 px-6 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-4 w-4" />
                {rotationAngle === 0 ? 'Select an Angle to Rotate' : 'Apply Rotation & Save PDF'}
              </button>
            </div>
          </div>

          {/* Right Column: Live Interactive Preview Frame */}
          <div className="lg:col-span-7 sticky top-24">
            <PDFPreviewFrame
              file={file}
              pageCount={pageCount}
              rotationAngle={rotationAngle}
              height="580px"
              badge={rotationAngle === 0 ? 'Original (0°)' : `Previewing +${rotationAngle}°`}
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
        title="Rotating PDF Document"
      />
    </div>
  );
}

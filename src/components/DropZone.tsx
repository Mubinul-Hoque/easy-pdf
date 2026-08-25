'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, AlertCircle, Plus, Sparkles } from 'lucide-react';

import { formatMbSize } from '@/context/ToolsContext';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  maxSizeMB?: number;
  accept?: Record<string, string[]>;
  acceptLabel?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  buttonLabel?: string;
}

const DropZoneComponent: React.FC<DropZoneProps> = ({
  onFilesSelected,
  multiple = true,
  maxSizeMB = 100,
  accept = { 'application/pdf': ['.pdf'] },
  acceptLabel,
  title = 'Select PDF files',
  subtitle = 'or drop PDFs here to get started',
  badge,
  buttonLabel,
}) => {
  const [error, setError] = useState<string | null>(null);

  const displayAcceptLabel = acceptLabel || `PDF files up to ${formatMbSize(maxSizeMB)}`;

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);
      if (rejectedFiles && rejectedFiles.length > 0) {
        const firstRejection = rejectedFiles[0];
        const isTooLarge = firstRejection.errors?.some((e: any) => e.code === 'file-too-large');
        if (isTooLarge) {
          setError(`File exceeds the maximum upload limit of ${formatMbSize(maxSizeMB)}.`);
        } else {
          setError('Please upload valid supported PDF files.');
        }
        return;
      }
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected, maxSizeMB]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
    accept,
    maxSize: maxSizeMB * 1024 * 1024,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 sm:p-14 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01] shadow-xl shadow-indigo-500/10'
            : 'border-slate-300 bg-white hover:border-indigo-500/80 hover:bg-slate-50/50 hover:shadow-xl hover:shadow-slate-200/60 shadow-sm'
        }`}
      >
        <input {...getInputProps()} />

        {/* Top Badge */}
        {badge && (
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-600 border border-indigo-200">
            <Sparkles className="h-3.5 w-3.5" />
            {badge}
          </div>
        )}

        {/* Icon Cloud */}
        <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-md shadow-indigo-500/10">
          <UploadCloud className="h-10 w-10 animate-pulse-slow" />
        </div>

        {/* Action Title */}
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 tracking-tight group-hover:text-indigo-600 transition-colors">
          {isDragActive ? 'Drop your files right here...' : title}
        </h3>
        <p className="text-sm text-slate-500 mb-6 max-w-md">{subtitle}</p>

        {/* Button */}
        <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 group-hover:bg-indigo-700 transition-all duration-200">
          <Plus className="h-4 w-4" />
          {buttonLabel || `Choose File${multiple ? 's' : ''}`}
        </div>

        <div className="mt-4 text-xs text-slate-400 flex items-center gap-2">
          <span>{displayAcceptLabel}</span>
          <span>•</span>
          <span>Fast & 100% Secure</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export const DropZone = React.memo(DropZoneComponent);


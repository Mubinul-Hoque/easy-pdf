'use client';

import React, { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { PDFPageOrganizer, PageTileData } from '@/components/PDFPageOrganizer';
import { PDFEngine } from '@/lib/pdf-engine';
import { JobProgress } from '@/lib/types';
import { useToolConfig } from '@/context/ToolsContext';
import { Grid, AlertCircle, Wrench } from 'lucide-react';

export default function OrganizePDFPage() {
  const toolConfig = useToolConfig('organize-pdf');
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

  const handleSaveOrganizedPDF = async (pages: PageTileData[]) => {
    if (!file) return;

    try {
      setProgress({
        status: 'processing',
        percent: 30,
        message: 'Re-arranging page streams and applying rotation matrices...',
      });

      const buffer = await file.arrayBuffer();

      setProgress({
        status: 'processing',
        percent: 70,
        message: 'Compiling structured PDF catalog...',
      });

      const result = await PDFEngine.organizePDF(
        buffer,
        pages.map((p) => ({
          pageIndex: p.originalIndex,
          rotation: p.rotation,
          deleted: p.deleted,
        })),
        `organized_${file.name}`
      );

      setProgress({
        status: 'completed',
        percent: 100,
        message: 'Organization saved successfully!',
        result,
      });
    } catch (err: any) {
      console.error(err);
      setProgress({
        status: 'error',
        percent: 0,
        message: 'Organization failed',
        error: err.message || 'Failed to save organized PDF.',
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20 mb-4">
          <Grid className="h-6 w-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">Organize PDF Pages</h1>
        <p className="text-slate-600 text-base max-w-xl mx-auto">
          Sort, reorder, delete, duplicate, and rotate individual pages visually in a seamless grid.
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
            title="Select PDF to Organize"
            subtitle="or drop a PDF file here to rearrange pages"
            badge={`Visual Page Organizer • Files up to ${toolConfig.formattedMaxSize}`}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <PDFPageOrganizer
            file={file}
            onSave={handleSaveOrganizedPDF}
            isProcessing={progress.status === 'processing'}
          />
        </div>
      )}

      {/* Processing Modal */}
      <ProcessingModal
        progress={progress}
        onReset={() => {
          setProgress({ status: 'idle', percent: 0, message: '' });
          setFile(null);
        }}
        title="Building Organized PDF"
      />
    </div>
  );
}

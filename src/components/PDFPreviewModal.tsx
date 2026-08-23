'use client';

import React from 'react';
import { X } from 'lucide-react';
import { PDFPreviewFrame } from './PDFPreviewFrame';

export interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  fileUrl?: string;
  fileName?: string;
  pageCount?: number;
  rotationAngle?: number;
  title?: string;
}

const PDFPreviewModalComponent: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  onClose,
  file,
  fileUrl,
  fileName,
  pageCount,
  rotationAngle = 0,
  title = 'Document Inspection Preview',
}) => {
  if (!isOpen || (!file && !fileUrl)) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-slate-900 rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 text-white">
          <div>
            <h3 className="text-base font-bold text-slate-100">{title}</h3>
            <p className="text-xs text-slate-400">
              {fileName || file?.name} {pageCount ? `• ${pageCount} pages` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Frame Body */}
        <div className="flex-1 w-full h-full p-2 bg-slate-950 overflow-hidden">
          <PDFPreviewFrame
            file={file}
            fileUrl={fileUrl}
            fileName={fileName}
            pageCount={pageCount}
            rotationAngle={rotationAngle}
            height="100%"
            showFullscreenButton={false}
            className="h-full rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
};

export const PDFPreviewModal = React.memo(PDFPreviewModalComponent);


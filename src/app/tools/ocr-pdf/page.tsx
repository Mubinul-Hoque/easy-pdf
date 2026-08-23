'use client';

import React, { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { PDFPreviewFrame } from '@/components/PDFPreviewFrame';
import { OCREngine, OCROptimizationPreset, OCRPageResult } from '@/lib/ocr-engine';
import { JobProgress } from '@/lib/types';
import {
  Search,
  Sparkles,
  FileText,
  Globe,
  Sliders,
  Copy,
  Check,
  Download,
  Eye,
  Layers,
  Wand2,
  Table as TableIcon,
  ShieldCheck,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export default function OCRPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('eng');
  const [preset, setPreset] = useState<OCROptimizationPreset>('standard');
  const [extractedResults, setExtractedResults] = useState<OCRPageResult[] | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'text'>('preview');
  const [copied, setCopied] = useState(false);

  const [progress, setProgress] = useState<JobProgress>({
    status: 'idle',
    percent: 0,
    message: '',
  });

  const handleFileSelected = async (files: File[]) => {
    if (files.length > 0) {
      const selected = files[0];
      setFile(selected);
      setExtractedResults(null);
      try {
        const buffer = await selected.arrayBuffer();
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        setPageCount(doc.getPageCount());
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleOCR = async () => {
    if (!file) return;

    try {
      setProgress({
        status: 'processing',
        percent: 10,
        message: 'Rasterizing scanned pages into high-resolution (300 DPI) canvases...',
      });

      const buffer = await file.arrayBuffer();
      const outputName = `searchable_${file.name}`;

      // 1. High DPI rasterization for crisp text extraction
      const canvases = await OCREngine.rasterizePDFBufferToCanvases(buffer, 2.5);

      setProgress({
        status: 'processing',
        percent: 25,
        message: `Enhancing contrast and recognizing text across ${canvases.length} page${canvases.length > 1 ? 's' : ''}...`,
      });

      // 2. Run OCR with computer vision preprocessing and spatial layout preservation
      const ocrResults = await OCREngine.recognizeCanvases(
        canvases,
        selectedLanguage,
        preset,
        (percent, msg) => {
          setProgress((prev) => ({
            ...prev,
            status: 'processing',
            percent,
            message: msg,
          }));
        }
      );

      setExtractedResults(ocrResults);

      setProgress({
        status: 'processing',
        percent: 90,
        message: 'Building searchable PDF with pixel-perfect selectable text overlay...',
      });

      // 3. Create Searchable PDF with invisible text layer
      const result = await OCREngine.createSearchablePDFFromCanvases(
        canvases,
        ocrResults,
        outputName
      );

      setProgress({
        status: 'completed',
        percent: 100,
        message: 'Searchable PDF & formatted text created successfully!',
        result,
      });
    } catch (err: any) {
      console.error('OCR error:', err);
      setProgress({
        status: 'error',
        percent: 0,
        message: 'OCR failed',
        error: err.message || 'Failed to perform OCR on document.',
      });
    }
  };

  const fullCombinedText = extractedResults
    ? extractedResults
        .map((p) => `--- Page ${p.pageIndex + 1} ---\n${p.structuredText || p.fullText}`)
        .join('\n\n')
    : '';

  const handleCopyText = () => {
    if (!fullCombinedText) return;
    navigator.clipboard.writeText(fullCombinedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!fullCombinedText || !file) return;
    const blob = new Blob([fullCombinedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_ocr_extracted.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-600 text-white shadow-md shadow-purple-500/20 mb-3">
          <Search className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
          OCR PDF & Searchable Document Engine
        </h1>
        <p className="text-slate-600 text-sm max-w-xl mx-auto">
          Convert scanned PDFs into searchable, selectable documents with neural character recognition, deskewing, and layout preservation.
        </p>
      </div>

      {/* Main Workspace */}
      {!file ? (
        <div className="max-w-3xl mx-auto">
          <DropZone
            onFilesSelected={handleFileSelected}
            multiple={false}
            title="Select Scanned PDF for Neural OCR"
            subtitle="or drag and drop a scanned document here"
            badge="Neural Layout Recognition"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Settings */}
          <div className="lg:col-span-5 space-y-5">
            {/* File Card */}
            <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {pageCount} pages • {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setFile(null);
                  setExtractedResults(null);
                }}
                className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                Change
              </button>
            </div>

            {/* OCR Configuration */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-5 shadow-sm">
              {/* Preset Selector */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sliders className="h-4 w-4 text-violet-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Optimization Preset
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'standard',
                      name: 'Balanced (Auto)',
                      desc: 'Standard books, articles & reports',
                      icon: Wand2,
                    },
                    {
                      id: 'table_grid',
                      name: 'Tables & Invoices',
                      desc: 'Preserves columns & grid structure',
                      icon: TableIcon,
                    },
                    {
                      id: 'high_contrast',
                      name: 'High Contrast',
                      desc: 'Sharpens dark text on light bg',
                      icon: Layers,
                    },
                    {
                      id: 'faded_scan',
                      name: 'Faded Scan Recovery',
                      desc: 'Laplacian filter for low quality scans',
                      icon: Sparkles,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = preset === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setPreset(item.id as OCROptimizationPreset)}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-violet-500 bg-violet-50/80 text-violet-900 shadow-sm ring-2 ring-violet-500/20'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-violet-600' : 'text-slate-400'}`} />
                          <span className="font-bold text-xs">{item.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Globe className="h-4 w-4 text-violet-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Document Language
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { code: 'eng', name: 'English' },
                    { code: 'spa', name: 'Spanish' },
                    { code: 'fra', name: 'French' },
                    { code: 'deu', name: 'German' },
                    { code: 'ita', name: 'Italian' },
                    { code: 'por', name: 'Portuguese' },
                    { code: 'chi_sim', name: 'Chinese' },
                    { code: 'jpn', name: 'Japanese' },
                    { code: 'rus', name: 'Russian' },
                    { code: 'ara', name: 'Arabic' },
                    { code: 'hin', name: 'Hindi' },
                    { code: 'nld', name: 'Dutch' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLanguage(lang.code)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all text-center ${
                        selectedLanguage === lang.code
                          ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm ring-2 ring-violet-500/20'
                          : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleOCR}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 px-6 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all duration-200"
              >
                <Sparkles className="h-4 w-4" />
                Run OCR & Make Searchable
              </button>
            </div>

            {/* Extracted Structured Text Card (Available once OCR runs) */}
            {extractedResults && (
              <div className="rounded-3xl border border-violet-200 bg-gradient-to-b from-violet-50/40 to-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      OCR Text Ready
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {Math.round(
                      extractedResults.reduce((acc, p) => acc + p.confidence, 0) /
                        extractedResults.length
                    )}
                    % Confidence
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyText}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>

                  <button
                    onClick={handleDownloadTxt}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download .TXT
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: PDF Preview / Text Inspector */}
          <div className="lg:col-span-7 sticky top-24 space-y-3">
            {/* View Switcher Tabs */}
            {extractedResults && (
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'preview'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Visual Preview
                  </button>
                  <button
                    onClick={() => setActiveTab('text')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'text'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Structured Text
                  </button>
                </div>

                <span className="text-xs text-slate-500 pr-3 font-medium">
                  {extractedResults.reduce((acc, p) => acc + p.lines.length, 0)} text lines detected
                </span>
              </div>
            )}

            {activeTab === 'preview' || !extractedResults ? (
              <PDFPreviewFrame
                file={file}
                pageCount={pageCount}
                height="560px"
                badge="Document Source Preview"
              />
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm h-[560px] flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Structured Document Text
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Paragraphs and layout preserved
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto pt-3 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap selection:bg-violet-500/20 selection:text-violet-900 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 mt-2">
                  {fullCombinedText}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing Modal */}
      <ProcessingModal
        progress={progress}
        onReset={() => {
          setProgress({ status: 'idle', percent: 0, message: '' });
          setFile(null);
          setExtractedResults(null);
        }}
        title="Neural OCR & Layout Recognition"
      />
    </div>
  );
}

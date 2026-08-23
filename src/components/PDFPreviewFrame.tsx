'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadPDFJs } from '@/lib/pdfjs-loader';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';

export interface PDFPreviewFrameProps {
  file: File | null;
  fileUrl?: string;
  fileName?: string;
  pageCount?: number;
  rotationAngle?: number;
  highlightRanges?: string;
  className?: string;
  height?: string | number;
  title?: string;
  showFullscreenButton?: boolean;
  showZoomControls?: boolean;
  showRotationControls?: boolean;
  initialZoom?: number;
  badge?: string;
}

interface ThumbnailItem {
  pageNum: number;
  dataUrl?: string;
  aspectRatio?: number;
}

export const PDFPreviewFrame: React.FC<PDFPreviewFrameProps> = ({
  file,
  fileUrl,
  fileName,
  pageCount: externalPageCount,
  rotationAngle = 0,
  highlightRanges,
  className = '',
  height = '560px',
  showFullscreenButton = true,
  showZoomControls = true,
  showRotationControls = true,
  initialZoom = 100,
  badge,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(initialZoom);
  const [internalRotation, setInternalRotation] = useState<number>(rotationAngle);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(externalPageCount || 1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [thumbnails, setThumbnails] = useState<ThumbnailItem[]>([]);
  const [renderingPage, setRenderingPage] = useState<boolean>(false);
  const [pageAspectRatio, setPageAspectRatio] = useState<number>(1 / 1.414);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  // Sync external rotation prop
  useEffect(() => {
    setInternalRotation(rotationAngle);
  }, [rotationAngle]);

  // Sync external page count if provided
  useEffect(() => {
    if (externalPageCount && externalPageCount > 0) {
      setTotalPages(externalPageCount);
    }
  }, [externalPageCount]);

  // Generate object blob URL from File or use provided fileUrl
  useEffect(() => {
    let url: string | null = null;
    setLoading(true);
    setLoadError(null);
    setCurrentPage(1);

    try {
      if (fileUrl) {
        setBlobUrl(fileUrl);
      } else if (file) {
        url = URL.createObjectURL(file);
        setBlobUrl(url);
      } else {
        setBlobUrl(null);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Failed to create preview URL:', err);
      setLoadError('Unable to generate preview stream.');
      setLoading(false);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file, fileUrl]);

  // Load PDF Document via pdfjs-dist
  useEffect(() => {
    let isCancelled = false;

    async function loadDocument() {
      if (!blobUrl && !file) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const pdfjsLib = await loadPDFJs();
        if (!pdfjsLib) {
          throw new Error('PDF viewer library failed to initialize');
        }

        let loadingTask: any;
        if (file) {
          const buffer = await file.arrayBuffer();
          const safeBuffer = buffer.slice(0);
          loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(safeBuffer),
            cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
          });
        } else if (blobUrl) {
          loadingTask = pdfjsLib.getDocument({
            url: blobUrl,
            cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
          });
        }

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = doc;
        const numPages = doc.numPages;
        setTotalPages(numPages);
        setCurrentPage((prev) => Math.min(Math.max(1, prev), numPages));
        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error loading PDF in viewer:', err);
          setLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      isCancelled = true;
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [blobUrl, file]);

  // Render / Update thumbnails when document is ready or rotation changes
  useEffect(() => {
    let isCancelled = false;
    const doc = pdfDocRef.current;
    if (!doc || loading) return;

    const numPages = doc.numPages;
    const initialThumbs: ThumbnailItem[] = Array.from({ length: numPages }, (_, i) => ({
      pageNum: i + 1,
    }));
    setThumbnails(initialThumbs);

    async function generateThumbs() {
      for (let p = 1; p <= numPages; p++) {
        if (isCancelled) break;
        try {
          const page = await doc.getPage(p);
          const rotation = ((internalRotation % 360) + 360) % 360;
          const thumbViewport = page.getViewport({ scale: 0.35, rotation });
          const pageRatio = thumbViewport.width / thumbViewport.height;

          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = thumbViewport.width;
          thumbCanvas.height = thumbViewport.height;
          const ctx = thumbCanvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport: thumbViewport }).promise;
            const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);
            if (!isCancelled) {
              setThumbnails((prev) =>
                prev.map((item) =>
                  item.pageNum === p
                    ? { ...item, dataUrl, aspectRatio: pageRatio }
                    : item
                )
              );
            }
          }
        } catch (e) {
          console.warn(`Could not render thumbnail for page ${p}:`, e);
        }
      }
    }

    generateThumbs();

    return () => {
      isCancelled = true;
    };
  }, [totalPages, internalRotation, loading]);

  // Render current active page with exact preserved aspect ratio
  const renderCurrentPage = useCallback(async () => {
    const doc = pdfDocRef.current;
    const canvas = mainCanvasRef.current;
    const container = containerRef.current;
    if (!doc || !canvas) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // ignore
      }
    }

    try {
      setRenderingPage(true);
      const page = await doc.getPage(currentPage);

      const rotation = ((internalRotation % 360) + 360) % 360;
      const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
      const exactRatio = unscaledViewport.width / unscaledViewport.height;
      setPageAspectRatio(exactRatio);

      // Compute container bounds to fit page while strictly preserving aspect ratio
      const availWidth = Math.max(180, (container?.clientWidth || 700) - 48);
      const availHeight = Math.max(180, (container?.clientHeight || 500) - 48);

      const fitScale = Math.min(
        availWidth / unscaledViewport.width,
        availHeight / unscaledViewport.height
      );

      // Apply proportional zoom over the fit scale
      const effectiveScale = fitScale * (zoom / 100);
      const viewport = page.getViewport({ scale: effectiveScale, rotation });

      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      const displayWidth = Math.round(viewport.width);
      const displayHeight = Math.round(viewport.height);

      canvas.width = Math.round(displayWidth * dpr);
      canvas.height = Math.round(displayHeight * dpr);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
      setRenderingPage(false);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Page render error:', err);
      }
      setRenderingPage(false);
    }
  }, [currentPage, zoom, internalRotation]);

  useEffect(() => {
    if (pdfDocRef.current) {
      renderCurrentPage();
    }
  }, [currentPage, zoom, internalRotation, renderCurrentPage]);

  // Window/Container Resize Observer to maintain exact aspect ratio dynamically
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let resizeTimer: any = null;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (pdfDocRef.current) {
          renderCurrentPage();
        }
      }, 100);
    });

    observer.observe(container);
    return () => {
      clearTimeout(resizeTimer);
      observer.disconnect();
    };
  }, [renderCurrentPage]);

  const displayName = fileName || file?.name || 'Document.pdf';
  const displaySize = file?.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : '';

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 20, 250));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 20, 40));
  const handleResetZoom = () => setZoom(100);
  const handleRotateCw = () => setInternalRotation((prev) => (prev + 90) % 360);

  const goToPrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const parsedRanges = React.useMemo(() => {
    if (!highlightRanges || !totalPages) return [];
    const ranges: { start: number; end: number; label: string }[] = [];
    const parts = highlightRanges.split(',').map((s) => s.trim());
    parts.forEach((part, idx) => {
      if (part.includes('-')) {
        const [s, e] = part.split('-').map((n) => parseInt(n.trim(), 10));
        if (!isNaN(s) && !isNaN(e)) {
          ranges.push({
            start: Math.max(1, s),
            end: Math.min(totalPages, e),
            label: `Part ${idx + 1} (${s}-${e})`,
          });
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p)) {
          ranges.push({ start: p, end: p, label: `Part ${idx + 1} (Page ${p})` });
        }
      }
    });
    return ranges;
  }, [highlightRanges, totalPages]);

  if (!file && !fileUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center ${className}`}
        style={{ minHeight: height }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 mb-3 shadow-inner">
          <FileText className="h-7 w-7" />
        </div>
        <p className="font-semibold text-slate-700 text-sm">No Document Selected</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Upload a PDF file to inspect and preview the live document here.
        </p>
      </div>
    );
  }

  const previewContent = (
    <div className="relative flex flex-col h-full w-full bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xl select-none">
      {/* Top Glassmorphic Navigation & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white z-20">
        {/* Left: Sidebar Toggle & Document Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => setShowSidebar((prev) => !prev)}
            title={showSidebar ? 'Hide Thumbnails Sidebar' : 'Show Thumbnails Sidebar'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              showSidebar
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-800/90 border-slate-700/70 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            {showSidebar ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeft className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Thumbnails</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 shrink-0">
              <Eye className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-slate-100 truncate max-w-[130px] sm:max-w-[200px]">
                  {displayName}
                </span>
                {badge && (
                  <span className="shrink-0 rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                {totalPages > 0 ? `${totalPages} ${totalPages === 1 ? 'page' : 'pages'}` : 'Document Preview'}
                {displaySize && <span>• {displaySize}</span>}
                {internalRotation !== 0 && (
                  <span className="text-indigo-400 font-medium">({internalRotation}°)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Center/Right: Page Navigator, Zoom & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Page Switcher */}
          {totalPages > 1 && (
            <div className="flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700/60">
              <button
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                title="Previous Page"
                className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div className="px-2 text-[11px] font-semibold text-slate-200 flex items-center gap-1">
                <span>{currentPage}</span>
                <span className="text-slate-500">/</span>
                <span>{totalPages}</span>
              </div>
              <button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                title="Next Page"
                className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Zoom Controls */}
          {showZoomControls && (
            <div className="hidden md:flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700/60">
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                disabled={zoom <= 40}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                title="Reset Zoom (Fit Page)"
                className="px-2 text-[11px] font-bold text-slate-300 hover:text-white"
              >
                {zoom}%
              </button>
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                disabled={zoom >= 250}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Rotation Toggle */}
          {showRotationControls && (
            <button
              onClick={handleRotateCw}
              title="Preview Rotation (+90°)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition-colors"
            >
              <RotateCw className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline text-[11px] font-medium">Rotate</span>
            </button>
          )}

          {/* Direct Download/Popout */}
          {blobUrl && (
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new window"
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/60 text-slate-400 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {/* Fullscreen Toggle */}
          {showFullscreenButton && (
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
              className="p-1.5 sm:p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Split Pages Indicator Ribbon (if applicable for split tool) */}
      {parsedRanges.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-950/60 border-b border-indigo-800/40 overflow-x-auto text-[11px] text-indigo-200">
          <span className="font-semibold text-indigo-300 shrink-0">Split Targets:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {parsedRanges.map((r, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-indigo-600/30 border border-indigo-500/40 text-indigo-100 font-medium"
              >
                {r.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area: Thumbnails Sidebar + Canvas Viewport */}
      <div className="relative flex-1 w-full h-full flex overflow-hidden bg-slate-950">
        {/* Clean Thumbnails Sidebar (Contains only Page Thumbnails; NO Outline, NO Attachments, NO Layers) */}
        {showSidebar && (
          <aside className="w-48 sm:w-56 shrink-0 h-full bg-slate-900 border-r border-slate-800 flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
              <span className="text-[11px] font-bold tracking-wide uppercase text-slate-400">
                Thumbnails ({totalPages})
              </span>
              <button
                onClick={() => setShowSidebar(false)}
                title="Close Thumbnails Sidebar"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {thumbnails.map((thumb) => {
                const isActive = thumb.pageNum === currentPage;
                const ratio = thumb.aspectRatio || pageAspectRatio;
                return (
                  <button
                    key={thumb.pageNum}
                    onClick={() => setCurrentPage(thumb.pageNum)}
                    className={`w-full flex flex-col items-center p-2 rounded-xl border text-center transition-all ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/30'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div
                      className="w-full rounded-lg bg-slate-900 border border-slate-800/60 overflow-hidden flex items-center justify-center relative shadow-sm"
                      style={{
                        aspectRatio: `${ratio}`,
                        maxHeight: '180px',
                      }}
                    >
                      {thumb.dataUrl ? (
                        <img
                          src={thumb.dataUrl}
                          alt={`Page ${thumb.pageNum}`}
                          className="w-full h-full object-contain pointer-events-none"
                          style={{
                            aspectRatio: `${ratio}`,
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2">
                          <FileText className="h-5 w-5 text-slate-600 mb-1" />
                          <span className="text-[10px] text-slate-500">P.{thumb.pageNum}</span>
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-semibold mt-1.5 ${
                        isActive ? 'text-indigo-300' : 'text-slate-400'
                      }`}
                    >
                      Page {thumb.pageNum}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* PDF Canvas Viewport with Preserved Page Ratio */}
        <div
          ref={containerRef}
          className="relative flex-1 w-full h-full bg-slate-950 overflow-auto flex items-center justify-center p-4 sm:p-6 custom-scrollbar"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <div className="h-10 w-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
              <p className="text-xs font-semibold text-slate-300">Rendering Document Stream...</p>
              <p className="text-[11px] text-slate-500 mt-1">Preparing high-definition vector preview</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-red-400 max-w-sm">
              <p className="text-sm font-bold">{loadError}</p>
              <p className="text-xs text-slate-400 mt-1">
                The PDF may be password-protected or have damaged internal streams.
              </p>
            </div>
          ) : pdfDocRef.current ? (
            <div className="relative flex items-center justify-center m-auto">
              <div
                className="relative rounded-lg shadow-2xl overflow-hidden bg-white border border-slate-800 transition-all duration-150"
                style={{
                  aspectRatio: `${pageAspectRatio}`,
                }}
              >
                <canvas ref={mainCanvasRef} className="block" />
                {renderingPage && (
                  <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] flex items-center justify-center transition-opacity">
                    <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
          ) : blobUrl ? (
            <iframe
              src={`${blobUrl}#toolbar=0&navpanes=0&pagemode=none&scrollbar=1&view=Fit`}
              title={displayName}
              className="w-full h-full border-0 bg-white rounded-lg"
            />
          ) : null}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 z-10">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-slate-300">Client-Side Secure Preview</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Zero Server Upload</span>
          <span className="text-slate-600">•</span>
          <span>100% Private</span>
        </div>
      </div>
    </div>
  );

  // If Fullscreen Mode is active, render fixed portal overlay
  if (isFullscreen) {
    return (
      <>
        {/* Placeholder to prevent layout shift */}
        <div
          className={`flex items-center justify-center rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/40 p-6 text-center text-xs text-indigo-600 font-semibold ${className}`}
          style={{ height }}
        >
          <span>Document is expanded in Fullscreen Preview modal</span>
        </div>

        {/* Fullscreen Overlay */}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full h-full max-w-7xl max-h-[94vh] flex flex-col">
            {previewContent}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={`w-full flex flex-col ${className}`} style={{ height }}>
      {previewContent}
    </div>
  );
};

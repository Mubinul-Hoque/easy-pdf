'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Copy,
  MoveLeft,
  MoveRight,
  Sparkles,
  Eye,
  LayoutGrid,
  Loader2,
  ZoomIn,
  RefreshCw,
  GripVertical,
  ArrowUpDown,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { loadPDFJs } from '@/lib/pdfjs-loader';
import { PDFPreviewFrame } from './PDFPreviewFrame';
import { PDFPreviewModal } from './PDFPreviewModal';

export interface PageTileData {
  id: string;
  originalIndex: number;
  rotation: number;
  deleted: boolean;
  aspectRatio?: number;
}

interface PDFPageOrganizerProps {
  file: File;
  onSave: (pages: PageTileData[]) => void;
  isProcessing?: boolean;
}

export const PDFPageOrganizer: React.FC<PDFPageOrganizerProps> = ({
  file,
  onSave,
  isProcessing,
}) => {
  const [pages, setPages] = useState<PageTileData[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [loadingThumbnails, setLoadingThumbnails] = useState(true);
  const [renderedThumbnailsCount, setRenderedThumbnailsCount] = useState(0);
  const [viewTab, setViewTab] = useState<'grid' | 'preview'>('grid');
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectInitialPage, setInspectInitialPage] = useState<number>(1);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    async function loadPagesAndThumbnails() {
      try {
        setLoadingThumbnails(true);
        setThumbnails({});
        setRenderedThumbnailsCount(0);

        const arrayBuffer = await file.arrayBuffer();
        const safeBuffer = arrayBuffer.slice(0);

        // 1. Load dimensions and page structure via PDF-lib
        const pdfDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();

        const initialPages: PageTileData[] = Array.from({ length: count }, (_, i) => {
          let pageRatio = 1 / 1.414;
          try {
            const p = pdfDoc.getPage(i);
            const { width, height } = p.getSize();
            if (width && height) {
              pageRatio = width / height;
            }
          } catch {}

          return {
            id: `page-${i + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            originalIndex: i,
            rotation: 0,
            deleted: false,
            aspectRatio: pageRatio,
          };
        });

        if (isMountedRef.current) {
          setPages(initialPages);
        }

        // 2. Render Live Visual Thumbnails for every page via PDF.js
        const pdfjsLib = await loadPDFJs();
        if (!pdfjsLib) {
          setLoadingThumbnails(false);
          return;
        }

        const safePdfJsBuffer = arrayBuffer.slice(0);
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(safePdfJsBuffer),
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/cmaps/`,
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        const total = doc.numPages;

        for (let i = 1; i <= total; i++) {
          if (!isMountedRef.current) break;

          try {
            const page = await doc.getPage(i);
            // 0.6 scale provides sharp, lightweight retina thumbnails for grid
            const viewport = page.getViewport({ scale: 0.6 });

            const canvas = document.createElement('canvas');
            canvas.width = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            const ctx = canvas.getContext('2d');

            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              await page.render({ canvasContext: ctx, viewport }).promise;

              const thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
              if (isMountedRef.current) {
                setThumbnails((prev) => ({ ...prev, [i - 1]: thumbUrl }));
                setRenderedThumbnailsCount((prev) => prev + 1);
              }
            }
          } catch (pageRenderErr) {
            console.warn(`Error rendering thumbnail for page ${i}:`, pageRenderErr);
          }
        }

        if (isMountedRef.current) {
          setLoadingThumbnails(false);
        }
      } catch (err) {
        console.error('Error loading PDF pages and thumbnails:', err);
        if (isMountedRef.current) {
          setLoadingThumbnails(false);
        }
      }
    }

    loadPagesAndThumbnails();

    return () => {
      isMountedRef.current = false;
    };
  }, [file]);

  const rotatePage = (index: number, angle: number = 90) => {
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === index
          ? { ...p, rotation: ((p.rotation + angle) % 360 + 360) % 360 }
          : p
      )
    );
  };

  const rotateAll = (angle: number = 90) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: ((p.rotation + angle) % 360 + 360) % 360,
      }))
    );
  };

  const deletePage = (index: number) => {
    setPages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const duplicatePage = (index: number) => {
    setPages((prev) => {
      const target = prev[index];
      const copy: PageTileData = {
        ...target,
        id: `page-${target.originalIndex + 1}-dup-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      };
      const newPages = [...prev];
      newPages.splice(index + 1, 0, copy);
      return newPages;
    });
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= pages.length ||
      toIndex >= pages.length
    ) {
      return;
    }
    setPages((prev) => {
      const newPages = [...prev];
      const [moved] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, moved);
      return newPages;
    });
  };

  const resetPages = () => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: 0,
      }))
    );
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      movePage(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const activePages = pages.filter((p) => !p.deleted);

  return (
    <div className="w-full space-y-6">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          {/* View Mode Toggle: Live Grid vs Preview Frame */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewTab('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewTab === 'grid'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Live Page Grid ({activePages.length})
            </button>
            <button
              onClick={() => setViewTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewTab === 'preview'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Full Preview Frame
            </button>
          </div>

          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="hidden sm:inline text-xs text-slate-500 truncate max-w-xs font-medium">
            {file.name}
          </span>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => rotateAll(90)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            title="Rotate all pages 90° clockwise"
          >
            <RotateCw className="h-3.5 w-3.5 text-indigo-600" />
            Rotate All +90°
          </button>

          <button
            onClick={() => rotateAll(270)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            title="Rotate all pages 90° counter-clockwise"
          >
            <RotateCcw className="h-3.5 w-3.5 text-purple-600" />
            Rotate All -90°
          </button>

          <button
            onClick={resetPages}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            title="Reset rotations to original orientation"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Rotations
          </button>

          <button
            onClick={() => onSave(pages)}
            disabled={isProcessing || activePages.length === 0}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Apply & Save PDF
          </button>
        </div>
      </div>

      {/* Grid View or Full Preview View */}
      {viewTab === 'preview' ? (
        <div className="w-full">
          <PDFPreviewFrame
            file={file}
            pageCount={activePages.length}
            height="620px"
            badge="Organized Document Preview"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Drag & Drop Hint & Progress Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ArrowUpDown className="h-3.5 w-3.5 text-indigo-600" />
              <span>
                <strong>Drag and drop</strong> any card to reorder pages in real time.
              </span>
            </div>

            {loadingThumbnails && renderedThumbnailsCount < pages.length && (
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                <span>
                  Generating live previews ({renderedThumbnailsCount}/{pages.length})...
                </span>
              </div>
            )}
          </div>

          {/* Live Page Tiles Grid with Drag & Drop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {pages.map((page, index) => {
              const isRotatedLandscape = page.rotation % 180 !== 0;
              const ratio = page.aspectRatio || 1 / 1.414;
              const tileAspectRatio = isRotatedLandscape ? 1 / ratio : ratio;

              const isBeingDragged = draggedIndex === index;
              const isDragTarget = dragOverIndex === index && draggedIndex !== index;

              return (
                <div
                  key={page.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={(e) => handleDragLeave(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group relative flex flex-col rounded-2xl border p-3 transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
                    isBeingDragged
                      ? 'opacity-30 scale-95 border-dashed border-indigo-400 bg-indigo-50/50 shadow-inner'
                      : isDragTarget
                      ? 'ring-2 ring-indigo-500 ring-offset-2 border-indigo-500 bg-indigo-50/30 scale-[1.03] shadow-lg z-20'
                      : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 shadow-sm'
                  }`}
                >
                  {/* Top Header: Dynamic Page Number & Move Controls */}
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="cursor-grab active:cursor-grabbing text-slate-400 group-hover:text-indigo-600 transition-colors">
                        <GripVertical className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 text-xs shadow-xs">
                        #{index + 1}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                        (Orig: P.{page.originalIndex + 1})
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          movePage(index, index - 1);
                        }}
                        disabled={index === 0}
                        title="Move Left"
                        className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors"
                      >
                        <MoveLeft className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          movePage(index, index + 1);
                        }}
                        disabled={index === pages.length - 1}
                        title="Move Right"
                        className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors"
                      >
                        <MoveRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Live Visual Thumbnail Canvas Card */}
                  <div
                    className="relative flex w-full items-center justify-center rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shadow-inner cursor-pointer hover:bg-indigo-50/20 transition-all"
                    style={{ aspectRatio: `${tileAspectRatio}` }}
                    onClick={() => {
                      setInspectInitialPage(page.originalIndex + 1);
                      setInspectModalOpen(true);
                    }}
                    title="Click to inspect page in full resolution"
                  >
                    {thumbnails[page.originalIndex] ? (
                      <div className="relative w-full h-full flex items-center justify-center overflow-hidden p-1.5 pointer-events-none">
                        <img
                          src={thumbnails[page.originalIndex]}
                          alt={`Page ${index + 1}`}
                          className="max-w-full max-h-full object-contain rounded-md shadow-xs transition-transform duration-300 ease-out"
                          style={{
                            transform: `rotate(${page.rotation}deg)`,
                          }}
                        />

                        {/* Hover Overlay with Zoom Icon */}
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-xs">
                          <div className="flex items-center gap-1 bg-white/95 text-slate-900 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md">
                            <ZoomIn className="h-3.5 w-3.5 text-indigo-600" />
                            Inspect
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
                        <span className="text-[10px] text-slate-400 font-medium">
                          Loading P.{page.originalIndex + 1}...
                        </span>
                      </div>
                    )}

                    {/* Rotation Badge if rotated */}
                    {page.rotation !== 0 && (
                      <div className="absolute bottom-1.5 right-1.5 bg-indigo-600/90 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-md shadow-xs backdrop-blur-xs">
                        {page.rotation}°
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Controls: Rotate, Duplicate, Delete */}
                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rotatePage(index, -90);
                      }}
                      title="Rotate 90° Counter-Clockwise"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rotatePage(index, 90);
                      }}
                      title="Rotate 90° Clockwise"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicatePage(index);
                      }}
                      title="Duplicate Page"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(index);
                      }}
                      title="Delete Page"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inspect High-Res Modal */}
      <PDFPreviewModal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        file={file}
        pageCount={pages.length}
        title={`PDF Page Inspector (Page ${inspectInitialPage})`}
      />
    </div>
  );
};

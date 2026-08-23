export type ToolCategory = 'organize' | 'optimize';

export interface PDFToolMeta {
  id: string;
  name: string;
  shortDesc: string;
  description: string;
  category: ToolCategory;
  href: string;
  icon: string;
  badge?: string;
  color: string;
}

export interface PDFPageInfo {
  pageIndex: number;
  rotation: number;
  deleted: boolean;
  thumbnailUrl?: string;
  aspectRatio: number;
}

export interface ProcessedResult {
  fileName: string;
  downloadUrl: string;
  fileSizeBytes: number;
  originalSizeBytes?: number;
  pageCount?: number;
  compressionRatio?: number;
  jobId?: string;
  fileIds?: string[];
  additionalFiles?: Array<{ downloadUrl: string; fileName: string; fileSizeBytes?: number }>;
}

export interface JobProgress {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  percent: number;
  message: string;
  result?: ProcessedResult;
  error?: string;
}

export type CompressionLevel = 'low' | 'balanced' | 'max';

export interface OrganizeOperation {
  pageIndex: number;
  rotation: number;
  deleted: boolean;
  duplicateCount?: number;
}

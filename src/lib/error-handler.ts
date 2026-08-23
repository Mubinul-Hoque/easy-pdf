import { dbService } from './db';

export interface StandardizedError {
  code: string;
  userMessage: string;
  technicalDetails?: string;
}

/**
 * Parses raw PDF/WASM/Engine exceptions into clean, helpful user messages.
 */
export function formatUserFriendlyError(err: any): StandardizedError {
  const msg = (err?.message || String(err || '')).toLowerCase();

  // 1. Password Protected / Encrypted PDF
  if (msg.includes('encrypt') || msg.includes('password') || msg.includes('decrypt')) {
    return {
      code: 'PASSWORD_PROTECTED',
      userMessage: 'This PDF is protected with a password. Please unlock the file or remove its password before processing.',
      technicalDetails: err?.message,
    };
  }

  // 2. Corrupted PDF Structure or Missing Header
  if (
    msg.includes('failed to parse') ||
    msg.includes('invalid pdf') ||
    msg.includes('no %pdf- header') ||
    msg.includes('corrupted') ||
    msg.includes('unexpected token')
  ) {
    return {
      code: 'CORRUPTED_DOCUMENT',
      userMessage: 'The uploaded file appears to be damaged or not a valid PDF. Try running it through our Repair PDF tool first.',
      technicalDetails: err?.message,
    };
  }

  // 3. Out of Memory / Buffer Size Exceeded
  if (msg.includes('memory') || msg.includes('allocation') || msg.includes('out of memory') || msg.includes('buffer')) {
    return {
      code: 'MEMORY_LIMIT_EXCEEDED',
      userMessage: 'The document is too large to process in a single batch. Please try splitting the document or processing fewer pages.',
      technicalDetails: err?.message,
    };
  }

  // 4. Invalid Split Range
  if (msg.includes('range') || msg.includes('out of bounds') || msg.includes('index')) {
    return {
      code: 'INVALID_PAGE_RANGE',
      userMessage: 'Invalid page range specified. Please ensure page numbers fall within document bounds (e.g., 1-5, 8).',
      technicalDetails: err?.message,
    };
  }

  // 5. OCR Engine / Language Pack Failure
  if (msg.includes('tesseract') || msg.includes('ocr') || msg.includes('traineddata')) {
    return {
      code: 'OCR_ENGINE_NOTICE',
      userMessage: 'OCR text recognition encountered an issue with the selected scan. Try using the "High Contrast" preset.',
      technicalDetails: err?.message,
    };
  }

  // Default Generic Error
  return {
    code: 'PROCESSING_ERROR',
    userMessage: 'We were unable to process this document. Please check the file and try again.',
    technicalDetails: err?.message,
  };
}

/**
 * Safely logs technical error diagnostics to backend database without crashing
 */
export async function logJobFailure(params: {
  jobId: string;
  errorCode: string;
  errorMessage: string;
  stackTrace?: any;
}): Promise<void> {
  try {
    await dbService.saveFailedJob({
      id: `fail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      jobId: params.jobId,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      stackTrace: params.stackTrace || {},
    });
  } catch (logErr) {
    console.warn('[Error Logger Notice] Fallback logging active:', logErr);
  }
}

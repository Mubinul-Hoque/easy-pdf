/**
 * Safe Client-Side Download Manager with Auto-Download & Server File Cleanup
 */

export interface DownloadItem {
  downloadUrl: string;
  fileName: string;
  fileSizeBytes?: number;
}

/**
 * Triggers a direct native browser download for a single file URL
 */
export async function triggerFileDownload(downloadUrl: string, fileName: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  return new Promise((resolve) => {
    try {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      // Allow browser download pipeline to engage before resolving
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        resolve(true);
      }, 350);
    } catch (err) {
      console.error('File auto-download error:', err);
      resolve(false);
    }
  });
}

/**
 * Automatically downloads multiple files in sequence to prevent browser pop-up blockers
 */
export async function triggerBatchDownload(files: DownloadItem[]): Promise<boolean> {
  if (!files || files.length === 0) return false;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await triggerFileDownload(file.downloadUrl, file.fileName);
    if (i < files.length - 1) {
      // 300ms pause between sequential file downloads
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return true;
}

/**
 * Notify server to safely delete source and converted files after download completion
 */
export async function requestServerFileCleanup(params: {
  jobId?: string;
  fileIds?: string[];
  storageKeys?: string[];
}): Promise<boolean> {
  try {
    const payload = JSON.stringify(params);

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/files/cleanup', blob);
      return true;
    }

    const res = await fetch('/api/files/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });

    return res.ok;
  } catch (err) {
    console.warn('Storage cleanup notification error:', err);
    return false;
  }
}

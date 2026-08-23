/**
 * Format raw byte size into clean human-readable units (B, KB, MB, GB)
 */
export function formatBytes(bytes?: number, decimals: number = 1): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${(bytes / Math.pow(k, idx)).toFixed(decimals)} ${sizes[idx]}`;
}

/**
 * Format duration in milliseconds to human-readable string (e.g. 240ms or 1.4s)
 */
export function formatDuration(ms?: number): string {
  if (!ms || isNaN(ms) || ms <= 0) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Format server uptime in seconds to human-readable string (e.g. 3d 4h or 12m 30s)
 */
export function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const days = Math.floor(seconds / 86400);
  const hrs = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hrs}h`;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m ${seconds % 60}s`;
}

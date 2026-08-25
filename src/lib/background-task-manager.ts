/**
 * Background Task Manager
 * Ensures long-running processing jobs (compression, merging, OCR, splitting, etc.)
 * continue running at full speed without pausing or throttling when the user switches
 * to another browser tab, minimizes the browser, or moves to another application.
 */

// 1. Unthrottled microtask/macrotask yielding using MessageChannel
export function yieldExecution(): Promise<void> {
  if (typeof MessageChannel !== 'undefined') {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        channel.port2.close();
        resolve();
      };
      channel.port2.postMessage(null);
    });
  }
  return Promise.resolve();
}

// 2. Web Worker Heartbeat (keeps event loop unthrottled in background tabs)
class WorkerHeartbeat {
  private worker: Worker | null = null;

  start() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;
    if (this.worker) return;

    try {
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(function() {
              self.postMessage('tick');
            }, 50);
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      this.worker = new Worker(url);
      this.worker.onmessage = () => {
        // Keep active main thread pump
      };
      this.worker.postMessage('start');
      URL.revokeObjectURL(url);
    } catch {
      // Fallback
    }
  }

  stop() {
    if (this.worker) {
      try {
        this.worker.postMessage('stop');
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }
  }
}

// 3. Audio Context Silent Heartbeat (signals to browser that background task is active)
class AudioKeepAlive {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;

  start() {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (!this.oscillator) {
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 0.00001; // Silent / inaudible
        this.oscillator = this.audioCtx.createOscillator();
        this.oscillator.frequency.value = 440;
        this.oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        this.oscillator.start();
      }
    } catch {
      // Ignored if browser restricts autoplay without user gesture
    }
  }

  stop() {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch {}
      this.oscillator = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }
}

// 4. Screen Wake Lock
class WakeLockKeepAlive {
  private wakeLock: any = null;

  async start() {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch {
        // Ignored
      }
    }
  }

  stop() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }
  }
}

// 5. Unified Background Task Manager
class BackgroundTaskManagerClass {
  private activeJobsCount = 0;
  private workerHeartbeat = new WorkerHeartbeat();
  private audioKeepAlive = new AudioKeepAlive();
  private wakeLockKeepAlive = new WakeLockKeepAlive();

  startKeepAlive() {
    this.activeJobsCount++;
    if (this.activeJobsCount === 1) {
      this.workerHeartbeat.start();
      this.audioKeepAlive.start();
      this.wakeLockKeepAlive.start();
    }
  }

  stopKeepAlive() {
    this.activeJobsCount = Math.max(0, this.activeJobsCount - 1);
    if (this.activeJobsCount === 0) {
      this.workerHeartbeat.stop();
      this.audioKeepAlive.stop();
      this.wakeLockKeepAlive.stop();
    }
  }

  async runWithKeepAlive<T>(task: () => Promise<T>): Promise<T> {
    this.startKeepAlive();
    try {
      return await task();
    } finally {
      this.stopKeepAlive();
    }
  }
}

export const BackgroundTaskManager = new BackgroundTaskManagerClass();

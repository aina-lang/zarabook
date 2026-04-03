/**
 * DownloadStore — in-memory reactive state for active downloads.
 * Uses a simple pub/sub pattern without Zustand to avoid extra dependencies.
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'error' | 'cancelled';

export interface ActiveDownload {
  bookId: string;
  bookTitle: string;
  bookSize: number;
  fromPeerId: string;
  progress: number;       // 0.0 → 1.0
  bytesReceived: number;
  status: DownloadStatus;
  startedAt: number;
  format?: string;
  category?: string;
  thumbnailMessageId?: number;
  error?: string;
  localPath?: string;
}

type Listener = () => void;

export type DownloadMode = 'wifi' | 'cellular' | 'both';

class DownloadStoreClass {
  private downloads: Map<string, ActiveDownload> = new Map();
  private resumables: Map<string, any> = new Map();
  private listeners: Set<Listener> = new Set();
  
  private downloadMode: DownloadMode = 'both';
  private maxConcurrent: number = 2;
  private publicDir: string | null = null;
  private initialized: boolean = false;

  // Map to track UI promises for downloads
  private deferreds: Map<string, { resolve: (uri: string) => void, reject: (err: any) => void }> = new Map();

  async init() {
    if (this.initialized) return;
    try {
      const [mode, max, dir] = await Promise.all([
        AsyncStorage.getItem('dl-mode'),
        AsyncStorage.getItem('dl-max'),
        AsyncStorage.getItem('dl-dir')
      ]);
      if (mode) this.downloadMode = mode as DownloadMode;
      if (max) this.maxConcurrent = parseInt(max, 10);
      if (dir) this.publicDir = dir;
      this.initialized = true;
      this.notify();
      this.processQueue(); // Start any pending downloads on init
    } catch (e) {
      console.error('Failed to init DownloadStore', e);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  setDownloadMode(mode: DownloadMode) {
    this.downloadMode = mode;
    this.notify();
    AsyncStorage.setItem('dl-mode', mode);
  }

  getDownloadMode(): DownloadMode {
    return this.downloadMode;
  }

  setMaxConcurrent(val: number) {
    this.maxConcurrent = val;
    this.notify();
    AsyncStorage.setItem('dl-max', val.toString());
    this.processQueue(); // Trigger queue if limit increased
  }

  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  setPublicDir(dir: string | null) {
    this.publicDir = dir;
    this.notify();
    if (dir) AsyncStorage.setItem('dl-dir', dir);
    else AsyncStorage.removeItem('dl-dir');
  }

  getPublicDir(): string | null {
    return this.publicDir;
  }

  getDownloadingCount(): number {
    return Array.from(this.downloads.values()).filter(d => d.status === 'downloading').length;
  }

  getActiveCount(): number {
    return Array.from(this.downloads.values()).filter(d => 
      d.status === 'downloading' || d.status === 'pending'
    ).length;
  }

  canStartMore(): boolean {
    return this.getDownloadingCount() < this.maxConcurrent;
  }

  getAll(): ActiveDownload[] {
    return Array.from(this.downloads.values());
  }

  get(bookId: string): ActiveDownload | undefined {
    return this.downloads.get(bookId);
  }

  start(entry: Omit<ActiveDownload, 'progress' | 'bytesReceived' | 'status' | 'startedAt'>, resumable?: any): Promise<string> {
    const existing = this.downloads.get(entry.bookId);
    
    this.downloads.set(entry.bookId, {
      ...entry,
      progress: existing?.progress || 0,
      bytesReceived: existing?.bytesReceived || 0,
      status: 'pending',
      startedAt: existing?.startedAt || Date.now(),
    });

    if (resumable) this.resumables.set(entry.bookId, resumable);

    // Create promise for the UI to await
    return new Promise((resolve, reject) => {
      this.deferreds.set(entry.bookId, { resolve, reject });
      this.processQueue();
      this.notify();
    });
  }

  private async processQueue() {
    const downloadingCount = this.getDownloadingCount();
    const availableSlots = this.maxConcurrent - downloadingCount;

    if (availableSlots <= 0) return;

    // Get all pending downloads, sorted by startedAt
    const pending = Array.from(this.downloads.values())
      .filter(d => d.status === 'pending')
      .sort((a, b) => a.startedAt - b.startedAt);

    for (let i = 0; i < Math.min(availableSlots, pending.length); i++) {
      const dl = pending[i];
      this.runDownload(dl.bookId);
    }
  }

  private async runDownload(bookId: string) {
    const dl = this.downloads.get(bookId);
    const resumable = this.resumables.get(bookId);
    const deferred = this.deferreds.get(bookId);

    if (!dl || !resumable || dl.status !== 'pending') return;

    try {
      this.downloads.set(bookId, { ...dl, status: 'downloading' });
      this.notify();

      const result = await resumable.downloadAsync();
      
      if (result) {
        // Note: complete() will be called by the UI after await start()
        // but we resolve the deferred here.
        if (deferred) {
          deferred.resolve(result.uri);
          this.deferreds.delete(bookId);
        }
      } else {
        throw new Error("Téléchargement interrompu");
      }
    } catch (e: any) {
      console.error("[DownloadStore] runDownload failed:", e);
      const currentDl = this.downloads.get(bookId);
      if (currentDl && currentDl.status !== 'cancelled' && currentDl.status !== 'paused') {
        this.fail(bookId, e.message || "Erreur inconnue");
        if (deferred) {
          deferred.reject(e);
          this.deferreds.delete(bookId);
        }
      }
    }
  }

  updateProgress(bookId: string, bytesReceived: number, total: number) {
    const dl = this.downloads.get(bookId);
    if (!dl || dl.status === 'paused' || dl.status === 'cancelled') return;
    this.downloads.set(bookId, {
      ...dl,
      bytesReceived,
      progress: total > 0 ? bytesReceived / total : 0,
      status: 'downloading',
    });
    this.notify();
  }

  async pause(bookId: string) {
    const dl = this.downloads.get(bookId);
    const resumable = this.resumables.get(bookId);
    if (!dl) return;

    if (dl.status === 'pending') {
      this.downloads.set(bookId, { ...dl, status: 'paused' });
      this.notify();
      return;
    }

    if (!resumable) return;

    try {
      await resumable.pauseAsync();
      this.downloads.set(bookId, { ...dl, status: 'paused' });
      this.notify();
      this.processQueue(); // Release slot
    } catch (e) {
      console.error("[DownloadStore] Failed to pause:", e);
    }
  }

  async resume(bookId: string) {
    const dl = this.downloads.get(bookId);
    const resumable = this.resumables.get(bookId);
    if (!dl || !resumable || dl.status !== 'paused') return;

    try {
      this.downloads.set(bookId, { ...dl, status: 'pending' });
      this.notify();
      this.processQueue(); // Queue it up!
    } catch (e) {
      console.error("[DownloadStore] Failed to resume:", e);
      this.fail(bookId, "Échec de reprise");
    }
  }

  async cancel(bookId: string) {
    const dl = this.downloads.get(bookId);
    const resumable = this.resumables.get(bookId);
    if (resumable) {
      try {
        await resumable.pauseAsync(); // expo-file-system doesn't have a direct 'cancel', pause + remove is the way
      } catch (e) {}
    }
    if (dl) {
      this.downloads.set(bookId, { ...dl, status: 'cancelled' });
      this.resumables.delete(bookId);
      
      const deferred = this.deferreds.get(bookId);
      if (deferred) {
        deferred.reject(new Error("Téléchargement annulé"));
        this.deferreds.delete(bookId);
      }

      this.notify();
      this.processQueue(); // Release slot
    }
  }

  complete(bookId: string, localPath: string) {
    const dl = this.downloads.get(bookId);
    if (!dl) return;
    this.downloads.set(bookId, {
      ...dl,
      progress: 1,
      bytesReceived: dl.bookSize,
      status: 'completed',
      localPath,
    });
    this.resumables.delete(bookId);
    this.notify();
    this.processQueue(); // Release slot
  }

  fail(bookId: string, error: string) {
    const dl = this.downloads.get(bookId);
    if (!dl) return;
    this.downloads.set(bookId, { ...dl, status: 'error', error });
    this.resumables.delete(bookId);
    this.notify();
    this.processQueue(); // Release slot
  }

  remove(bookId: string) {
    this.downloads.delete(bookId);
    this.resumables.delete(bookId);
    this.notify();
  }
}

export const DownloadStore = new DownloadStoreClass();

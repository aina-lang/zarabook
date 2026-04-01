/**
 * DownloadStore — in-memory reactive state for active downloads.
 * Uses a simple pub/sub pattern without Zustand to avoid extra dependencies.
 */

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'error' | 'cancelled';

export interface ActiveDownload {
  bookId: string;
  bookTitle: string;
  bookSize: number;
  fromPeerId: string;
  progress: number;       // 0.0 → 1.0
  bytesReceived: number;
  status: DownloadStatus;
  startedAt: number;
  error?: string;
  localPath?: string;
}

type Listener = () => void;

class DownloadStoreClass {
  private downloads: Map<string, ActiveDownload> = new Map();
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  getAll(): ActiveDownload[] {
    return Array.from(this.downloads.values());
  }

  get(bookId: string): ActiveDownload | undefined {
    return this.downloads.get(bookId);
  }

  start(entry: Omit<ActiveDownload, 'progress' | 'bytesReceived' | 'status' | 'startedAt'>) {
    this.downloads.set(entry.bookId, {
      ...entry,
      progress: 0,
      bytesReceived: 0,
      status: 'pending',
      startedAt: Date.now(),
    });
    this.notify();
  }

  updateProgress(bookId: string, bytesReceived: number, total: number) {
    const dl = this.downloads.get(bookId);
    if (!dl) return;
    this.downloads.set(bookId, {
      ...dl,
      bytesReceived,
      progress: total > 0 ? bytesReceived / total : 0,
      status: 'downloading',
    });
    this.notify();
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
    this.notify();
  }

  fail(bookId: string, error: string) {
    const dl = this.downloads.get(bookId);
    if (!dl) return;
    this.downloads.set(bookId, { ...dl, status: 'error', error });
    this.notify();
  }

  cancel(bookId: string) {
    const dl = this.downloads.get(bookId);
    if (!dl) return;
    this.downloads.set(bookId, { ...dl, status: 'cancelled' });
    this.notify();
  }

  remove(bookId: string) {
    this.downloads.delete(bookId);
    this.notify();
  }
}

export const DownloadStore = new DownloadStoreClass();

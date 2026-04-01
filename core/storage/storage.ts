import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BookMetadata {
  id: string;           // SHA-256 hash
  title: string;
  author: string;
  description?: string;
  category: string;     // Roman, SF, Manga, etc.
  language?: string;
  format: 'pdf' | 'epub';
  fileSize: number;
  hash: string;
  ownerPeerId: string;
  isPublic: boolean;
  localPath?: string;
  addedAt: number;      // timestamp ms
  seedCount?: number;   // nb de seeders annoncés via GossipSub
  coverColor?: string;  // couleur hex générée depuis le hash
}

export interface PeerInfo {
  id: string;
  multiaddrs: string[];
  lastSeen: number;
  bookCount?: number;   // livres seedés par ce pair
}

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'error' | 'cancelled';

export interface DownloadEntry {
  bookId: string;
  bookTitle: string;
  bookSize: number;
  fromPeerId: string;
  progress: number;     // 0.0 → 1.0
  status: DownloadStatus;
  startedAt: number;
  completedAt?: number;
  error?: string;
  localPath?: string;
}

const KEYS = {
  BOOKS: 'bookmesh_books',
  PEERS: 'bookmesh_peers',
  DOWNLOADS: 'bookmesh_downloads',
  MY_PEER_ID: 'bookmesh_my_peer_id',
};

export const Storage = {
  // ─── Books ───────────────────────────────────────────────
  async saveBook(book: BookMetadata) {
    const books = await this.getBooks();
    const updatedBooks = { ...books, [book.id]: book };
    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(updatedBooks));
  },

  async getBooks(): Promise<Record<string, BookMetadata>> {
    const data = await AsyncStorage.getItem(KEYS.BOOKS);
    return data ? JSON.parse(data) : {};
  },

  async getBook(id: string): Promise<BookMetadata | null> {
    const books = await this.getBooks();
    return books[id] || null;
  },

  async deleteBook(id: string) {
    const books = await this.getBooks();
    delete books[id];
    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(books));
  },

  // ─── Peers ───────────────────────────────────────────────
  async savePeer(peer: PeerInfo) {
    const peers = await this.getPeers();
    const updatedPeers = { ...peers, [peer.id]: peer };
    await AsyncStorage.setItem(KEYS.PEERS, JSON.stringify(updatedPeers));
  },

  async getPeers(): Promise<Record<string, PeerInfo>> {
    const data = await AsyncStorage.getItem(KEYS.PEERS);
    return data ? JSON.parse(data) : {};
  },

  // ─── Downloads ───────────────────────────────────────────
  async saveDownload(entry: DownloadEntry) {
    const downloads = await this.getDownloads();
    const updated = { ...downloads, [entry.bookId]: entry };
    await AsyncStorage.setItem(KEYS.DOWNLOADS, JSON.stringify(updated));
  },

  async getDownloads(): Promise<Record<string, DownloadEntry>> {
    const data = await AsyncStorage.getItem(KEYS.DOWNLOADS);
    return data ? JSON.parse(data) : {};
  },

  async updateDownload(bookId: string, partial: Partial<DownloadEntry>) {
    const downloads = await this.getDownloads();
    if (downloads[bookId]) {
      downloads[bookId] = { ...downloads[bookId], ...partial };
      await AsyncStorage.setItem(KEYS.DOWNLOADS, JSON.stringify(downloads));
    }
  },

  async deleteDownload(bookId: string) {
    const downloads = await this.getDownloads();
    delete downloads[bookId];
    await AsyncStorage.setItem(KEYS.DOWNLOADS, JSON.stringify(downloads));
  },
};

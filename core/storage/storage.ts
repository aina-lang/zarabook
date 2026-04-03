import AsyncStorage from "@react-native-async-storage/async-storage";

export interface BookMetadata {
  id: string; // SHA-256 hash ou tg-ID
  title: string;
  author: string;
  category?: string;
  description?: string;
  language?: string;
  format: string; // pdf, epub, mp4, mp3...
  fileSize: number;
  hash: string;
  thumbnailMessageId?: number;
  localPath?: string;
  ownerPeerId?: string;
  isPublic?: boolean;
  seedCount?: number;
  telegramMessageId?: number;
  addedAt: number; 
  coverColor?: string; 
}

export type DownloadStatus =
  | "pending"
  | "downloading"
  | "completed"
  | "error"
  | "cancelled";

const BOOKS_KEY = "zarabook_books";
type Listener = () => void;

export const MetadataStore = {
  listeners: new Set<Listener>(),

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  notify() {
    this.listeners.forEach(l => l());
  },

  async saveBook(book: BookMetadata): Promise<void> {
    const books = await this.getAllBooks();
    const index = books.findIndex((b) => b.id === book.id);
    if (index > -1) {
      books[index] = book;
    } else {
      books.push(book);
    }
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(books));
    this.notify();
  },

  async getAllBooks(): Promise<BookMetadata[]> {
    try {
      const data = await AsyncStorage.getItem(BOOKS_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        // Migration de l'ancien format (Map/Object) vers Array
        return Object.values(parsed) as BookMetadata[];
      }
      
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("[MetadataStore] Error in getAllBooks:", e);
      return [];
    }
  },

  async getBook(id: string): Promise<BookMetadata | undefined> {
    const books = await this.getAllBooks();
    return books.find((b) => b.id === id);
  },

  async deleteBook(id: string): Promise<void> {
    const books = await this.getAllBooks();
    const filtered = books.filter((b) => b.id !== id);
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(filtered));
    this.notify();
  },

  async saveBooks(books: BookMetadata[]): Promise<void> {
    const existing = await this.getAllBooks();
    const map = new Map(existing.map(b => [b.id, b]));
    books.forEach(b => map.set(b.id, b));
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(Array.from(map.values())));
    this.notify();
  },

  async getBooks(): Promise<Record<string, BookMetadata>> {
    const all = await this.getAllBooks();
    return all.reduce((acc, b) => {
      acc[b.id] = b;
      return acc;
    }, {} as Record<string, BookMetadata>);
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(BOOKS_KEY);
    this.notify();
  },

  async saveDownload(book: BookMetadata): Promise<void> {
    await this.saveBook(book);
  },
};

export const Storage = MetadataStore;

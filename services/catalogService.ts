import { Libp2p } from 'libp2p';
import { Storage, BookMetadata } from '../core/storage/storage';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';

const CATALOG_TOPIC = 'bookmesh/catalog/1.0.0';

type CatalogMessage =
  | { type: 'announce'; book: BookMetadata }
  | { type: 'seed_count'; bookId: string; count: number };

export class CatalogService {
  private node: Libp2p;

  constructor(node: Libp2p) {
    this.node = node;
  }

  async start() {
    await (this.node.services as any).pubsub.subscribe(CATALOG_TOPIC);
    (this.node.services as any).pubsub.addEventListener('message', (evt: any) => {
      if (evt.detail.topic === CATALOG_TOPIC) {
        this.handleMessage(evt.detail.data);
      }
    });
  }

  private async handleMessage(data: Uint8Array) {
    try {
      const json = uint8ArrayToString(data);
      const msg: CatalogMessage = JSON.parse(json);

      if (msg.type === 'announce') {
        const metadata = msg.book;
        const existing = await Storage.getBook(metadata.id);
        if (!existing) {
          console.log(`[Catalog] Nouveau livre: ${metadata.title} de ${metadata.ownerPeerId}`);
          await Storage.saveBook({ ...metadata, localPath: undefined, addedAt: metadata.addedAt || Date.now() });
        } else if (!existing.localPath && metadata.seedCount) {
          // Mise à jour du seed count
          await Storage.saveBook({ ...existing, seedCount: (existing.seedCount ?? 0) + 1 });
        }
      }

      if (msg.type === 'seed_count') {
        const book = await Storage.getBook(msg.bookId);
        if (book) {
          await Storage.saveBook({ ...book, seedCount: msg.count });
        }
      }
    } catch (err) {
      console.error('[Catalog] Failed to parse message', err);
    }
  }

  async broadcastBook(book: BookMetadata) {
    const msg: CatalogMessage = { type: 'announce', book };
    const data = uint8ArrayFromString(JSON.stringify(msg));
    await (this.node.services as any).pubsub.publish(CATALOG_TOPIC, data);
    console.log(`[Catalog] Broadcasted: ${book.title}`);
  }

  async announceAllPublicBooks() {
    const books = await Storage.getBooks();
    for (const book of Object.values(books)) {
      if (book.isPublic && book.localPath) {
        await this.broadcastBook(book);
      }
    }
  }
}

import { Libp2p } from 'libp2p';
import { pipe } from 'it-pipe';
import { File } from 'expo-file-system';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { FileStore } from '../core/storage/fileStore';
import { DownloadStore } from '../core/store/downloadStore';
import { Storage } from '../core/storage/storage';

const PROTOCOL = '/bookmesh/file-transfer/1.0.0';
const CHUNK_SIZE = 64 * 1024; // 64KB chunks

export class TransferProtocol {
  private node: Libp2p;

  constructor(node: Libp2p) {
    this.node = node;
  }

  async start() {
    await this.node.handle(PROTOCOL, async ({ stream }: any) => {
      await pipe(
        stream,
        async function* (source: any) {
          for await (const msg of source) {
            const request = JSON.parse(uint8ArrayToString(msg.subarray()));
            if (request.type === 'request-chunk') {
              const { filename, offset, length } = request;
              const uri = await FileStore.getFileUri(filename);
              const file = new File(uri);
              const handle = file.open();
              handle.offset = offset;
              const bytes = handle.readBytes(length);
              handle.close();
              yield bytes;
            }
          }
        },
        stream
      );
    });
  }

  async downloadBook(
    peerId: string,
    book: { id: string; title: string; hash: string; fileSize: number },
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const { id: bookId, title: bookTitle, fileSize } = book;

    DownloadStore.start({ bookId, bookTitle, bookSize: fileSize, fromPeerId: peerId });

    try {
      const stream = await this.node.dialProtocol(peerId as any, PROTOCOL);
      const localUri = await FileStore.getFileUri(filename);

      let offset = 0;
      while (offset < fileSize) {
        const length = Math.min(CHUNK_SIZE, fileSize - offset);
        const request = JSON.stringify({ type: 'request-chunk', filename, offset, length });

        const response = await pipe(
          [uint8ArrayFromString(request)],
          stream as any,
          async (source: any) => {
            for await (const chunk of source) {
              return chunk.subarray();
            }
          }
        );

        if (!response) throw new Error('Chunk vide reçu');

        const file = new File(localUri);
        if (offset === 0 && !file.exists) {
          file.create();
        }
        const handle = file.open();
        handle.offset = offset;
        handle.writeBytes(response as Uint8Array);
        handle.close();

        offset += length;
        DownloadStore.updateProgress(bookId, offset, fileSize);
        onProgress?.(offset / fileSize);
      }

      DownloadStore.complete(bookId, localUri);

      // Persist into AsyncStorage
      await Storage.saveDownload({
        bookId,
        bookTitle,
        bookSize: fileSize,
        fromPeerId: peerId,
        progress: 1,
        status: 'completed',
        startedAt: Date.now(),
        completedAt: Date.now(),
        localPath: localUri,
      });

      return localUri;
    } catch (err: any) {
      const msg = err?.message ?? 'Erreur inconnue';
      DownloadStore.fail(bookId, msg);
      await Storage.saveDownload({
        bookId,
        bookTitle,
        bookSize: fileSize,
        fromPeerId: peerId,
        progress: 0,
        status: 'error',
        startedAt: Date.now(),
        error: msg,
      });
      throw err;
    }
  }
}

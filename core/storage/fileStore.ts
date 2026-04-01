import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

const BOOKS_DIR = `${FileSystem.documentDirectory}books/`;

export const FileStore = {
  async ensureDir() {
    const info = await FileSystem.getInfoAsync(BOOKS_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(BOOKS_DIR, { intermediates: true });
    }
  },

  async saveFile(uri: string, filename: string): Promise<string> {
    await this.ensureDir();
    const dest = `${BOOKS_DIR}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  },

  async getFileUri(filename: string): Promise<string> {
    return `${BOOKS_DIR}${filename}`;
  },

  async calculateHash(uri: string): Promise<string> {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
    );
    return hash;
  },

  async deleteFile(filename: string) {
    const uri = `${BOOKS_DIR}${filename}`;
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri);
    }
  }
};


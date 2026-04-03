import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIVATE_BOOKS_DIR = `${FileSystem.documentDirectory}ZaraBook/`;
const PUBLIC_BOOKS_DIR_ANDROID = '/storage/emulated/0/Download/ZaraBook/';
const STORAGE_KEY = 'zarabook_public_dir_uri';

export const FileStore = {
  async getPublicUri(): Promise<string | null> {
    const uri = await AsyncStorage.getItem(STORAGE_KEY);
    if (uri) return uri;
    
    // Best effort: Essayer de voir si on peut écrire dans Downloads directement (Android)
    try {
      const info = await FileSystem.getInfoAsync(PUBLIC_BOOKS_DIR_ANDROID);
      if (info.exists) return PUBLIC_BOOKS_DIR_ANDROID;
      
      await FileSystem.makeDirectoryAsync(PUBLIC_BOOKS_DIR_ANDROID, { intermediates: true });
      return PUBLIC_BOOKS_DIR_ANDROID;
    } catch (e) {
      // Échec: Probablement restriction Android 11+
      return null;
    }
  },

  async requestDirectory(): Promise<string | null> {
    const { StorageAccessFramework } = FileSystem;
    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    
    if (permissions.granted) {
      await AsyncStorage.setItem(STORAGE_KEY, permissions.directoryUri);
      return permissions.directoryUri;
    }
    return null;
  },

  async ensureDir() {
    // Créer le dossier privé (toujours utile en fallback)
    const info = await FileSystem.getInfoAsync(PRIVATE_BOOKS_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(PRIVATE_BOOKS_DIR, { intermediates: true });
    }
  },

  async saveFile(uri: string, filename: string): Promise<string> {
    const publicDirUri = await this.getPublicUri();
    
    if (publicDirUri) {
      if (publicDirUri.startsWith('content://')) {
        const { StorageAccessFramework } = FileSystem;
        const mime = filename.endsWith('.pdf') ? 'application/pdf' : 'application/epub+zip';
        const fileUri = await StorageAccessFramework.createFileAsync(publicDirUri, filename, mime);
        const content = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        await FileSystem.writeAsStringAsync(fileUri, content, { encoding: 'base64' });
        return fileUri;
      } else {
        // Chemin file:// (automatique Downloads ou privé)
        const dest = `${publicDirUri}${filename}`;
        await FileSystem.copyAsync({ from: uri, to: dest });
        return dest;
      }
    } else {
      // Fallback privé ultime
      await this.ensureDir();
      const dest = `${PRIVATE_BOOKS_DIR}${filename}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      return dest;
    }
  },

  async getFileUri(filename: string): Promise<string> {
    if (filename.startsWith('file://') || filename.startsWith('content://')) return filename;
    const publicDirUri = await this.getPublicUri();
    if (publicDirUri) {
       // Note: SAF URIs are complex, we usually store the full URI in the book metadata.
       // Here we return a default local path if not found.
       return `${PRIVATE_BOOKS_DIR}${filename}`;
    }
    return `${PRIVATE_BOOKS_DIR}${filename}`;
  },

  async calculateHash(uri: string): Promise<string> {
    const content = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      content
    );
    return hash;
  },

  async deleteFile(uri: string) {
    try {
      if (uri.startsWith('content://')) {
        await FileSystem.deleteAsync(uri);
      } else {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
          await FileSystem.deleteAsync(uri);
        }
      }
    } catch (e) {
      console.warn("[FileStore] Erreur suppression:", e);
    }
  },

  async openFile(uri: string) {
    try {
      const { Platform } = require('react-native');
      const IntentLauncher = require('expo-intent-launcher');
      const Sharing = require('expo-sharing');

      if (Platform.OS === 'android') {
        const contentUri = uri.startsWith('content://') ? uri : await FileSystem.getContentUriAsync(uri);
        
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: uri.endsWith('.pdf') ? 'application/pdf' : 'application/epub+zip'
          });
          return;
        } catch (e) {
          console.warn("[FileStore] IntentLauncher failed, using Sharing fallback");
        }
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: uri.endsWith('.pdf') ? 'application/pdf' : 'application/epub+zip',
          UTI: uri.endsWith('.pdf') ? 'com.adobe.pdf' : 'org.idpf.epub-container'
        });
      }
    } catch (e) {
      console.error("[FileStore] Erreur ouverture directe:", e);
      try {
        const Sharing = require('expo-sharing');
        await Sharing.shareAsync(uri);
      } catch (e2) {
        throw new Error("Impossible d'ouvrir le fichier. Installez un lecteur de documents.");
      }
    }
  }
};

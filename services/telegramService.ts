import * as FileSystem from "expo-file-system/legacy";

// URL de l'API en production
const NESTJS_URL = "https://zarabook-api.onrender.com/telegram";

export class TelegramService {
  async init() {
    // API is stateless and isolated on the backend. No initialization needed!
    console.log(
      "[TelegramService] Init: Le backend NestJS gère maintenant la connexion serveur !",
    );
  }

  async uploadFile(
    fileUri: string, 
    fileName: string, 
    category?: string,
    author?: string,
    description?: string
  ): Promise<{ messageId: number, thumbnailMessageId?: number }> {
    console.log(`[TelegramService] Upload de ${fileName} (${category || 'Autre'}, Author: ${author}) via NestJS API...`);
 
    try {
      const response = await FileSystem.uploadAsync(
        `${NESTJS_URL}/upload`,
        fileUri,
        {
          fieldName: "file",
          httpMethod: "POST",
          uploadType: 1 as any, 
          parameters: {
            name: fileName,
            category: category || 'Autre',
            author: author || '',
            description: description || '',
          },
        },
      );

      let responseData;
      try {
        responseData = JSON.parse(response.body);
      } catch (e) {
        throw new Error(`Le serveur a renvoyé du texte au lieu de JSON (Status: ${response.status}):\n${response.body.substring(0, 300)}`);
      }

      console.log("[TelegramService] Response: ", responseData);
      if (response.status !== 201 && response.status !== 200) {
        throw new Error(responseData?.message || "Erreur API serveur");
      }

      const uploadData = responseData.data || responseData;

      if (!uploadData.success || !uploadData.messageId) {
        throw new Error("Le serveur n'a pas renvoyé l'ID du message Telegram.");
      }

      console.log(
        `[TelegramService] Upload réussi! Message ID: ${uploadData.messageId}`,
      );
      return uploadData;
    } catch (err) {
      console.error("[TelegramService] Echec de l'upload via l'API: ", err);
      throw err;
    }
  }

  async downloadFile(
    messageId: number, 
    outputPath: string, 
    onProgress?: (progress: number, bytesDownloaded: number, totalBytes: number) => void
  ): Promise<FileSystem.DownloadResumable> {
    console.log(
      `[TelegramService] Téléchargement du message ID ${messageId} depuis NestJS API...`,
    );
 
    const url = `${NESTJS_URL}/download/${messageId}`;
    
    const resumable = FileSystem.createDownloadResumable(
      url,
      outputPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) {
          onProgress(
            progress, 
            downloadProgress.totalBytesWritten, 
            downloadProgress.totalBytesExpectedToWrite
          );
        }
      }
    );

    return resumable;
  }
}

export const telegramService = new TelegramService();

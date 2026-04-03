import Constants from 'expo-constants';

export interface AppUpdateData {
  version: string;
  description: string;
  telegramMessageId?: number;
  downloadUrl?: string;
}

export class UpdateService {
  /**
   * Compare app version with the server's latest version.
   * Returns AppUpdate if a new version is available, else null.
   */
  static async checkUpdate(currentVersion: string): Promise<AppUpdateData | null> {
    try {
      const resp = await fetch('https://hipster-api.fr/api/telegram/app-update/latest');
      if (!resp.ok) return null;
      
      const json = await resp.json();
      if (!json.success || !json.data) return null;

      const latest: AppUpdateData = json.data;
      
      if (this.isNewerVersion(currentVersion, latest.version)) {
        return latest;
      }
      return null;
    } catch (e) {
      console.warn('Erreur lors de la vérification de mise à jour:', e);
      return null;
    }
  }

  /**
   * Returns true if v2 > v1 
   * Simple compare assuming semantic versioning like "1.2.3"
   */
  private static isNewerVersion(v1: string, v2: string): boolean {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p2 > p1) return true;
      if (p2 < p1) return false;
    }
    return false;
  }
}

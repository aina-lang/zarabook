import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Download, AlertCircle, CheckCircle, Smartphone } from 'lucide-react-native';
import { useTheme } from '@/core/context/ThemeContext';
import { UpdateService, AppUpdateData } from '@/core/services/updateService';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { useTranslation } from '@/core/i18n/I18nContext';
import { SocketService } from '@/core/services/socketService';
import * as Notifications from 'expo-notifications';

import Constants from 'expo-constants';

const CURRENT_VERSION = Constants.expoConfig?.version || (Constants as any).manifest?.version || '1.0.0';
export function UpdateBanner({ onUpdateFound }: { onUpdateFound?: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [update, setUpdate] = useState<AppUpdateData | null>(null);
  const [status, setStatus] = useState<'idle' | 'downloading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 1. Vérification initiale REST
    UpdateService.checkUpdate(CURRENT_VERSION).then(res => {
      if (res) {
        setUpdate(res);
        if (onUpdateFound) onUpdateFound();
      }
    });

    // 2. Abonnement au WebSocket pour le Push Temps Réel
    const unsubscribe = SocketService.subscribeToAppUpdates((data: AppUpdateData) => {
      if (UpdateService.isNewerVersion(CURRENT_VERSION, data.version)) {
        setUpdate(data);
        if (onUpdateFound) onUpdateFound();

        // Envoi d'une notification push native
        Notifications.requestPermissionsAsync().then(({ status }) => {
          if (status === 'granted') {
            Notifications.scheduleNotificationAsync({
              content: {
                title: "Mise à jour disponible 🚀",
                body: `La nouvelle version ${data.version} de ZaraBook est prête à être installée.`,
                data: { downloadUrl: data.downloadUrl },
              },
              trigger: null, // Immédiat
            });
          }
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDownload = async () => {
    if (!update?.downloadUrl) return;
    setStatus('downloading');
    try {
      const filename = `ZaraBook_Update_${update.version}.apk`;
      const tempPath = FileSystem.cacheDirectory + filename;
      
      const downloadResumable = FileSystem.createDownloadResumable(
        update.downloadUrl,
        tempPath,
        {},
        (dlProgress) => {
          if (dlProgress.totalBytesExpectedToWrite > 0) {
            const pct = dlProgress.totalBytesWritten / dlProgress.totalBytesExpectedToWrite;
            setProgress(pct);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (result && result.uri) {
        setStatus('ready');
        try {
          const cUri = await FileSystem.getContentUriAsync(result.uri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: cUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/vnd.android.package-archive'
          });
        } catch (e) {
          console.error("Installation failed:", e);
          setStatus('error');
        }
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (!update || status === 'ready') return null;

  return (
    <View style={{ 
      margin: 16, backgroundColor: colors.card, borderRadius: 16, 
      borderWidth: 1, borderColor: colors.primary + '60', padding: 14,
      shadowColor: colors.primary, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
          <Smartphone size={20} color={colors.primary} />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{t('components.updateTitle', { version: update.version })}</Text>
          <Text style={{ color: colors.textDim, fontSize: 13, marginTop: 4, lineHeight: 18 }}>{update.description}</Text>
          
          <View style={{ marginTop: 12 }}>
            {status === 'idle' && (
              <TouchableOpacity
                onPress={handleDownload}
                style={{ backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Download size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{t('components.updateDownload')}</Text>
              </TouchableOpacity>
            )}
            
            {status === 'downloading' && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: colors.textDim, fontSize: 12 }}>{t('components.updateDownloading')}</Text>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{Math.round(progress * 100)}%</Text>
                </View>
                <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' }}>
                  <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 99 }} />
                </View>
              </View>
            )}
            
            {status === 'error' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <AlertCircle size={14} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 12 }}>{t('components.updateError')}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

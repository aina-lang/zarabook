import { UpdateBanner } from '@/components/UpdateBanner';
import { useModal } from '@/core/context/ModalContext';
import { useTheme } from '@/core/context/ThemeContext';
import { useTranslation } from '@/core/i18n/I18nContext';
import { FileStore } from '@/core/storage/fileStore';
import { DownloadMode, DownloadStore } from '@/core/store/downloadStore';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { ChevronLeft, Database, FolderOpen, Github, Globe, GraduationCap, Info, Layers, Mail, MessageCircle, Minus, Moon, Plus, Shield, Smartphone, Sun, Wifi } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { theme, colors, toggleTheme, isDark } = useTheme();
  const { t, setLocale, locale } = useTranslation();
  const { showModal } = useModal();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [downloadMode, setDownloadMode] = useState<DownloadMode>(DownloadStore.getDownloadMode());
  const [maxConcurrent, setMaxConcurrent] = useState(DownloadStore.getMaxConcurrent());
  const [publicDir, setPublicDir] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    FileStore.getPublicUri().then(setPublicDir);
    const sub = DownloadStore.subscribe(() => {
      setDownloadMode(DownloadStore.getDownloadMode());
      setMaxConcurrent(DownloadStore.getMaxConcurrent());
    });
    return () => sub();
  }, []);

  const handleModeChange = (mode: DownloadMode) => {
    setDownloadMode(mode);
    DownloadStore.setDownloadMode(mode);
  };

  const handleMaxChange = (val: number) => {
    setMaxConcurrent(val);
    DownloadStore.setMaxConcurrent(val);
  };

  const handleRequestDir = async () => {
    const uri = await FileStore.requestDirectory();
    if (uri) setPublicDir(uri);
  };

  const handleClearCache = () => {
    showModal({
      type: 'delete',
      title: t('settings.clearCacheTitle'),
      message: t('settings.clearCacheMsg'),
      confirmText: t('settings.clearBtn'),
      onConfirm: async () => {
        setIsCleaning(true);
        try {
          const cacheDir = FileSystem.cacheDirectory;
          if (cacheDir) {
            const files = await FileSystem.readDirectoryAsync(cacheDir);
            await Promise.all(
              files.map(file => FileSystem.deleteAsync(cacheDir + file, { idempotent: true }))
            );
          }
          showModal({ type: 'success', title: t('common.success'), message: t('settings.clearCacheSuccess') });
        } catch (e) {
          showModal({ type: 'error', title: t('common.error'), message: t('settings.clearCacheError') });
        } finally {
          setIsCleaning(false);
        }
      }
    });
  };

  const SettingRow = ({ icon, label, children, description }: { icon: React.ReactNode, label: string, children: React.ReactNode, description?: string }) => (
    <View style={{
      paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </View>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
        </View>
        {children}
      </View>
      {description && <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 4, marginLeft: 48 }}>{description}</Text>}
    </View>
  );

  const OptionGroup = ({ options, current, onSelect }: { options: { label: string, value: any, icon?: any }[], current: any, onSelect: (v: any) => void }) => (
    <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 4, gap: 4, marginTop: 10 }}>
      {options.map(opt => (
        <TouchableOpacity
          key={String(opt.value)}
          onPress={() => onSelect(opt.value)}
          style={{
            flex: 1, paddingVertical: 8, borderRadius: 8,
            backgroundColor: current === opt.value ? colors.primary : 'transparent',
            alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6
          }}
        >
          {opt.icon && React.cloneElement(opt.icon, { size: 14, color: current === opt.value ? '#fff' : colors.textDim })}
          <Text style={{ color: current === opt.value ? '#fff' : colors.textDim, fontSize: 12, fontWeight: '600' }}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center', gap: 16,
        borderBottomWidth: 1, borderBottomColor: colors.border
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{t('settings.title')}</Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <UpdateBanner />

        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8, marginTop: 10 }}>{t('settings.appearance')}</Text>
        <View style={{ backgroundColor: colors.card + '20', borderRadius: 20, paddingHorizontal: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
          <SettingRow
            icon={isDark ? <Moon size={18} color={colors.primary} /> : <Sun size={18} color={colors.primary} />}
            label={t('settings.darkMode')}
          >
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#334155', true: colors.primary + '80' }}
              thumbColor={isDark ? colors.primary : '#f1f5f9'}
            />
          </SettingRow>

          <SettingRow
            icon={<Globe size={18} color={colors.primary} />}
            label={t('settings.language')}
          >
            <View style={{ flexDirection: 'row', gap: 4, backgroundColor: colors.card, padding: 2, borderRadius: 10 }}>
              {[
                { code: 'fr', flag: '🇫🇷' },
                { code: 'en', flag: '🇬🇧' },
                // { code: 'mg', flag: '🇲🇬' },
                { code: 'de', flag: '🇩🇪' }
              ].map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => setLocale(lang.code as any)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: locale === lang.code ? colors.primary : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Text style={{ fontSize: 13 }}>{lang.flag}</Text>
                  <Text style={{ color: locale === lang.code ? '#fff' : colors.textDim, fontSize: 10, fontWeight: '800' }}>{lang.code.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SettingRow>
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 }}>{t('settings.downloads')}</Text>
        <View style={{ backgroundColor: colors.card + '20', borderRadius: 20, paddingHorizontal: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>

          <SettingRow icon={<FolderOpen size={18} color={colors.primary} />} label={t('settings.targetFolder')} description={publicDir ? publicDir.split('/').pop() : t('settings.notConfigured')}>
            <TouchableOpacity onPress={handleRequestDir} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary + '15' }}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{t('settings.change')}</Text>
            </TouchableOpacity>
          </SettingRow>

          <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={18} color={colors.primary} />
                </View>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('settings.maxConcurrent')}</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 4 }}>
                <TouchableOpacity
                  onPress={() => handleMaxChange(Math.max(1, maxConcurrent - 1))}
                  style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Minus size={16} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', minWidth: 20, textAlign: 'center' }}>{maxConcurrent}</Text>
                <TouchableOpacity
                  onPress={() => handleMaxChange(Math.min(10, maxConcurrent + 1))}
                  style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={{ paddingVertical: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                <Wifi size={18} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('settings.dataMode')}</Text>
            </View>
            <OptionGroup
              current={downloadMode}
              onSelect={handleModeChange}
              options={[
                { label: t('settings.dataMode_wifi'), value: 'wifi', icon: <Wifi /> },
                { label: t('settings.dataMode_cellular'), value: 'cellular', icon: <Smartphone /> },
                { label: t('settings.dataMode_both'), value: 'both', icon: <Globe /> },
              ]}
            />
          </View>

        </View>

        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 }}>{t('settings.securityCache')}</Text>
        <View style={{ backgroundColor: colors.card + '20', borderRadius: 20, paddingHorizontal: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
          <SettingRow icon={<Database size={18} color={colors.textDim} />} label={t('settings.clearCache')} description={t('settings.clearCacheDesc')}>
            <TouchableOpacity
              onPress={handleClearCache}
              disabled={isCleaning}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.border }}
            >
              {isCleaning ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{t('settings.clearBtn')}</Text>}
            </TouchableOpacity>
          </SettingRow>
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 }}>{t('settings.aboutDev')}</Text>
        <View style={{ backgroundColor: colors.card + '20', borderRadius: 20, paddingHorizontal: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Rafandeferana Maminiaina Mercia</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <GraduationCap size={14} color={colors.textDim} />
              <Text style={{ color: colors.textDim, fontSize: 13 }}>{t('settings.university')}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => Linking.openURL('whatsapp://send?phone=261325715347')}
            style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(37,211,102,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={18} color="#25D366" />
              </View>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>+261 32 57 153 47</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://github.com/aina-lang')}
            style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                <Github size={18} color={colors.textDim} />
              </View>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>aina-lang</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:merciaaina@gmail.com')}
            style={{ paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(234,67,53,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={18} color="#EA4335" />
              </View>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>merciaaina@gmail.com</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 }}>{t('settings.legal')}</Text>
        <View style={{ backgroundColor: colors.card + '20', borderRadius: 20, paddingHorizontal: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>

          <TouchableOpacity
            onPress={() => showModal({
              type: 'info',
              title: t('settings.gdprTitle'),
              message: t('settings.gdprMsg'),
            })}
            style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('settings.gdpr')}</Text>
                <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 2 }}>{t('settings.gdprDesc')}</Text>
              </View>
            </View>
            <Info size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => showModal({
              type: 'info',
              title: t('settings.mitTitle'),
              message: t('settings.mitMsg'),
            })}
            style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                <Github size={18} color={colors.textDim} />
              </View>
              <View>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('settings.mit')}</Text>
                <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 2 }}>{t('settings.mitDesc')}</Text>
              </View>
            </View>
            <Info size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* TODO: Telegram API licence — à activer ultérieurement
          <TouchableOpacity
            onPress={() => showModal({
              type: 'info',
              title: 'API Telegram',
              message: 'ZaraBook utilise l\'API officielle de Telegram pour le stockage et le partage de fichiers.\n\nConformément aux Conditions d\'Utilisation de Telegram (Terms of Service), cette application :\n• N\'est pas affiliée à Telegram Messenger Inc.\n• Utilise l\'API à des fins non-commerciales et personnelles\n• Respecte les limitations de taux (rate limits) imposées par Telegram\n\nPour plus d\'informations : https://core.telegram.org/api/terms',
            })}
            style={{ paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                <Globe size={18} color="#229ED9" />
              </View>
              <View>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Licence API Telegram</Text>
                <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 2 }}>Conditions d'utilisation de l'API</Text>
              </View>
            </View>
            <Info size={16} color={colors.textMuted} />
          </TouchableOpacity>
          */}

        </View>

        <View style={{ marginTop: 8, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('settings.version', { version: '1.0.0' })}</Text>
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600', marginTop: 4 }}>@mercia • 2026</Text>
        </View>

      </ScrollView>
    </View>
  );
}

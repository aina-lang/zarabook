import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useModal } from '@/core/context/ModalContext';
import { useTheme } from '@/core/context/ThemeContext';
import { ChevronLeft, Upload, Book, User, Tag, FileText } from 'lucide-react-native';
import { telegramService } from '@/services/telegramService';
import { MetadataStore } from '@/core/storage/storage';
import { FileStore } from '@/core/storage/fileStore';
import { UploadStore } from '@/core/store/uploadStore';
import { useTranslation } from '@/core/i18n/I18nContext';
import { CATEGORY_MAP } from '@/core/utils/categoryUtils';



export default function UploadForm() {
  const { showModal } = useModal();
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const { uri, name, size } = useLocalSearchParams() as { uri: string; name: string; size: string };
  const router = useRouter();

  const [title, setTitle] = useState(name.split('.').slice(0, -1).join('.') || name);
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(UploadStore.getIsUploading());
  const [uploadProgress, setUploadProgress] = useState(UploadStore.getProgress());
  const [titleFocused, setTitleFocused] = useState(false);
  const [authorFocused, setAuthorFocused] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const sub = UploadStore.subscribe(() => {
      setIsUploading(UploadStore.getIsUploading());
      setUploadProgress(UploadStore.getProgress());
    });
    return () => sub();
  }, []);

  const handleUpload = async () => {
    if (UploadStore.getIsUploading()) return;
    if (!title.trim()) {
      showModal({ type: 'error', title: t('upload.errorTitle'), message: t('upload.errorMsg') });
      return;
    }

    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
    setIsUploading(true);
    setUploadProgress(0);

    const extension = name.split('.').pop() || '';
    const finalFileName = extension ? `${title}.${extension}` : title;
    UploadStore.startUpload(finalFileName, { uri, name, size });

    try {
      const displayCategory = (CATEGORY_MAP as any)[category] || category;
      
      const uploadRes = await telegramService.uploadFile(
        uri, 
        finalFileName, 
        displayCategory, 
        author, 
        description,
        (progress) => {
          setUploadProgress(progress);
          UploadStore.updateProgress(progress);
        }
      );
      const hash = await FileStore.calculateHash(uri);

      await MetadataStore.saveBook({
        id: `tg-${uploadRes.messageId || hash}`,
        title,
        author: author || t('upload.unknownAuthor'),
        category: displayCategory,
        description,
        format: name.split('.').pop()?.toLowerCase() || 'unknown',
        fileSize: parseInt(size, 10) || 0,
        hash: hash,
        telegramMessageId: uploadRes.messageId,
        thumbnailMessageId: uploadRes.thumbnailMessageId,
        addedAt: Date.now(),
      });

      UploadStore.endUpload();
      showModal({ type: 'success', title: t('common.success'), message: t('upload.successMsg') });
      router.replace('/(tabs)');
    } catch (error) {
      UploadStore.endUpload();
      showModal({ type: 'error', title: t('upload.errorTitle'), message: t('upload.uploadError') });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 50, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 2 }}>{t('upload.details')}</Text>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>{t('upload.title')}</Text>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 24 }} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 24 }}>
          <Label icon={<Book size={14} color={colors.primary} />} text={t('upload.bookTitle')} />
          <TextInput
            style={{ 
              backgroundColor: colors.input, borderRadius: 14, padding: 16, color: colors.text, fontSize: 15, 
              borderWidth: 1, borderColor: titleFocused ? colors.primary : colors.border 
            }}
            value={title} onChangeText={setTitle} onFocus={() => setTitleFocused(true)} onBlur={() => setTitleFocused(false)}
            placeholder={t('upload.placeholderTitle')} placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={{ marginBottom: 24 }}>
          <Label icon={<User size={14} color={colors.primary} />} text={t('upload.author')} />
          <TextInput
            style={{ 
              backgroundColor: colors.input, borderRadius: 14, padding: 16, color: colors.text, fontSize: 15,
              borderWidth: 1, borderColor: authorFocused ? colors.primary : colors.border
            }}
            value={author} onChangeText={setAuthor} onFocus={() => setAuthorFocused(true)} onBlur={() => setAuthorFocused(false)}
            placeholder={t('upload.placeholderAuthor')} placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={{ marginBottom: 24 }}>
          <Label icon={<Tag size={14} color={colors.primary} />} text={t('upload.category')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Object.keys(CATEGORY_MAP).map((catKey) => (
              <TouchableOpacity
                key={catKey} onPress={() => setCategory(catKey)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1,
                  backgroundColor: category === catKey ? colors.primary + '20' : colors.card,
                  borderColor: category === catKey ? colors.primary : colors.border
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: category === catKey ? colors.primary : colors.textDim }}>{t(`categories.${catKey}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: 24 }}>
          <Label icon={<FileText size={14} color={colors.primary} />} text={t('upload.summary')} />
          <TextInput
            style={{ 
              backgroundColor: colors.input, borderRadius: 14, padding: 16, color: colors.text, fontSize: 15,
              borderWidth: 1, borderColor: colors.border, height: 120, textAlignVertical: 'top'
            }}
            value={description} onChangeText={setDescription}
            placeholder={t('upload.placeholderSummary')} placeholderTextColor={colors.textMuted}
            multiline numberOfLines={4}
          />
        </View>
      </ScrollView>

      <View style={{ padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity 
            style={{ 
              height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', 
              flexDirection: 'row', gap: 10, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
              opacity: isUploading ? 0.9 : 1, overflow: 'hidden'
            }}
            onPress={handleUpload} disabled={isUploading} activeOpacity={0.8}
          >
            {isUploading && (
              <View 
                style={{ 
                  position: 'absolute', top: 0, bottom: 0, left: 0, 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  width: `${uploadProgress * 100}%` 
                }} 
              />
            )}
            
            {isUploading ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                  {t('upload.uploading')} {Math.round(uploadProgress * 100)}%
                </Text>
              </>
            ) : (
              <>
                <Upload size={20} color="#fff" strokeWidth={2.5} />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{t('upload.submit')}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

function Label({ icon, text }: { icon: React.ReactNode, text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginLeft: 4 }}>
      {icon}
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>{text.toUpperCase()}</Text>
    </View>
  );
}

import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Download, CheckCircle, Trash2, XCircle, PlayCircle, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/core/context/ThemeContext';
import { BookMetadata } from '@/core/storage/storage';
import { ActiveDownload } from '@/core/store/downloadStore';
import { useTranslation } from '@/core/i18n/I18nContext';
import { getLocalizedCategory } from '@/core/utils/categoryUtils';

const COVER_PALETTES = [
  ['#1e1b4b', '#312e81'],
  ['#0c4a6e', '#0369a1'],
  ['#14532d', '#166534'],
  ['#4c1d95', '#6d28d9'],
  ['#78350f', '#92400e'],
  ['#881337', '#9f1239'],
  ['#0f172a', '#1e293b'],
];

export function coverPalette(title: string): [string, string] {
  const idx = title.charCodeAt(0) % COVER_PALETTES.length;
  return COVER_PALETTES[idx] as [string, string];
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type BookCardProps = {
  item?: BookMetadata;
  activeDownload?: ActiveDownload | null;
  onPress?: () => void;
  onDownload?: () => void;
  onRemove?: () => void; // For trash/cancel
  onTogglePause?: () => void; // For pausing active download
  onRetry?: () => void; // For retrying failed download
  mode?: 'catalog' | 'local' | 'active'; // To determine the exact action icon semantics
};

export function BookCard({
  item,
  activeDownload,
  onPress,
  onDownload,
  onRemove,
  onTogglePause,
  onRetry,
  mode = 'catalog',
}: BookCardProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  // Unified metadata extraction
  const title = item?.title || activeDownload?.bookTitle || t('common.unknownTitle');
  const author = (!item?.author || item.author.toLowerCase() === 'auteur inconnu') ? t('common.unknownAuthor') : item.author;
  const fileSize = item?.fileSize || activeDownload?.bookSize || 0;
  const thumbnailMessageId = item?.thumbnailMessageId || activeDownload?.thumbnailMessageId;
  const format = item?.format || 'PDF'; // Default to PDF if we don't have it
  const isDownloaded = !!(item?.localPath || mode === 'local');

  const status = activeDownload?.status;
  const isDownloading = status === 'downloading' || status === 'pending';
  const isPaused = status === 'paused';
  const isError = status === 'error' || status === 'cancelled';
  
  const progressPct = activeDownload ? Math.round(activeDownload.progress * 100) : 0;
  const [c1] = coverPalette(title);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => { scale.value = withSpring(0.96); };
  const handlePressOut = () => { scale.value = withSpring(1); };

  const statusLabel = 
    status === 'error' ? t('book.status_error') : 
    status === 'cancelled' ? t('book.status_cancelled') : 
    status === 'paused' ? t('book.paused') :
    isDownloading ? t('book.downloading') : '';
  const statusColor = isError ? '#ef4444' : isPaused ? colors.textDim : colors.primary;

  // The actual render handles everything to match index.tsx exactly
  return (
    <Animated.View style={[animatedStyle, { marginBottom: 10 }]}>
      {/* 
        Si on est dans Downloads, et que la suppression est possible, on pourrait l'ajouter 
        Mais visuellement on a besoin du même composant
      */}
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          backgroundColor: colors.card,
          borderRadius: 18,
          padding: 12,
          borderWidth: 1,
          borderColor: isError ? 'rgba(239,68,68,0.2)' : colors.border,
          alignItems: 'center',
          gap: 12,
        }}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Cover */}
        <View
          style={{
            width: 64,
            height: 90,
            borderRadius: 12,
            overflow: 'hidden',
            flexShrink: 0,
            backgroundColor: c1,
          }}
        >
          {thumbnailMessageId && item ? (
            <Animated.Image
              source={{ uri: `https://hipster-api.fr/api/telegram/thumbnail/${thumbnailMessageId}` }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              resizeMode="cover"
              // @ts-ignore - Reanimated 3+ Shared Element prop
              sharedTransitionTag={`book-image-${item.id}`}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.primary, fontSize: 26, fontWeight: '800' }}>
                {title.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {item && (
            <View
              style={{
                position: 'absolute', bottom: 0, right: 0,
                backgroundColor: colors.primary, paddingHorizontal: 5,
                paddingVertical: 2, borderTopLeftRadius: 8,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>{format.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', lineHeight: 18, marginBottom: 3 }} numberOfLines={2}>
            {title}
          </Text>
          <Text style={{ color: colors.textDim, fontSize: 11, marginBottom: 6 }} numberOfLines={1}>
            {author}
          </Text>

          {/* Tags row */}
          {mode !== 'active' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: isDownloading ? 6 : 0 }}>
              {item?.category && (
                <View style={{ backgroundColor: colors.badge, borderWidth: 1, borderColor: colors.primary + '40', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 }}>
                  <Text style={{ color: colors.primary, fontSize: 9, fontWeight: '700' }}>
                    {getLocalizedCategory(item.category, t).split(' ')[0]}
                  </Text>
                </View>
              )}
              <View style={{ backgroundColor: isDark ? '#1a1d24' : '#f1f5f9', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 }}>
                <Text style={{ color: colors.textDim, fontSize: 9 }}>{formatSize(fileSize)}</Text>
              </View>
            </View>
          ) : (
             <View>
               <Text style={{ color: statusColor, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{statusLabel} • {progressPct}%</Text>
               <Text style={{ color: colors.textDim, fontSize: 10, marginTop: 2 }}>{formatSize(activeDownload?.bytesReceived || 0)} / {formatSize(fileSize)}</Text>
             </View>
          )}

          {/* Progress bar */}
          {(isDownloading || isPaused || isError) && mode !== 'active' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, height: 3, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' }}>
                <View style={{ width: `${progressPct}%`, height: '100%', backgroundColor: statusColor, borderRadius: 99 }} />
              </View>
              <Text style={{ color: statusColor, fontSize: 10, fontWeight: '700' }}>
                {statusLabel ? `${statusLabel} ` : ''}{progressPct}%
              </Text>
            </View>
          )}
        </View>

        {/* Action Button Container */}
        {mode === 'active' ? (
           <View style={{ flexDirection: 'row', gap: 6 }}>
             {/* Pause/Resume for active downloads */}
             {!isError && (
               <TouchableOpacity 
                  onPress={(e) => { e.stopPropagation(); onTogglePause?.(); }}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
               >
                 {isPaused ? <PlayCircle size={15} color={colors.primary} /> : <XCircle size={15} color={colors.textDim} />}
               </TouchableOpacity>
             )}
             {isError && (
                <TouchableOpacity 
                  onPress={(e) => { e.stopPropagation(); onRetry?.(); }}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <Download size={15} color={colors.primary} />
                </TouchableOpacity>
             )}
             {/* Cancel/Trash */}
             <TouchableOpacity 
                onPress={(e) => { e.stopPropagation(); onRemove?.(); }}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
             >
               <Trash2 size={15} color="#ef4444" />
             </TouchableOpacity>
           </View>
        ) : mode === 'local' ? (
           <View style={{ flexDirection: 'row', gap: 6 }}>
             <TouchableOpacity 
                onPress={(e) => { e.stopPropagation(); onRemove?.(); }}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
             >
               <Trash2 size={15} color="#ef4444" />
             </TouchableOpacity>
           </View>
        ) : (
          /* Catalog mode */
          isDownloaded ? (
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle size={17} color="#10b981" />
            </View>
          ) : isDownloading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ width: 34 }} />
          ) : (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onDownload?.(); }}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary + '40', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Download size={16} color={colors.primary} />
            </TouchableOpacity>
          )
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

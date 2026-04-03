import React from 'react';
import { StyleSheet, Text, Platform } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { WifiOff } from 'lucide-react-native';
import { useConnectivity } from '@/core/context/ConnectivityContext';
import { Colors } from '@/constants/theme';
import { useTranslation } from '@/core/i18n/I18nContext';

const C = Colors.dark;

export const ConnectivityBanner = () => {
  const { isOffline } = useConnectivity();
  const { t } = useTranslation();

  if (!isOffline) return null;

  return (
    <Animated.View 
      entering={FadeInUp.duration(300)} 
      exiting={FadeOutUp.duration(300)}
      style={styles.container}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]} />
      )}
      <WifiOff size={14} color={C.warning} />
      <Text style={styles.text}>{t('components.offlineBanner')}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 0, // Ajustement pour la barre d'état
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.warning + '33',
    overflow: 'hidden',
  },
  text: {
    color: C.warning,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

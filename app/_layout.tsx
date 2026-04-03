import React, { useState, useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import 'react-native-reanimated';
import './global.css';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModalProvider } from '@/core/context/ModalContext';
import { ConnectivityProvider } from '@/core/context/ConnectivityContext';
import { ConnectivityBanner } from '@/components/ConnectivityBanner';
import { ThemeProvider, useTheme } from '@/core/context/ThemeContext';
import { activateKeepAwakeAsync } from 'expo-keep-awake';
import { LanguageProvider, useTranslation } from '@/core/i18n/I18nContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { TransitionOverlay } from '@/components/TransitionOverlay';
import { CustomSplashScreen } from '@/components/CustomSplashScreen';
import { SocketService } from '@/core/services/socketService';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Empêche l'auto-hide du splash natif
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutContent() {
  const { theme, colors } = useTheme();
  const { isReady, locale } = useTranslation();
  const [showSplash, setShowSplash] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const router = useRouter();

  // Vérifier onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const val = await AsyncStorage.getItem('hasCompletedOnboarding');
        setHasOnboarded(val === 'true');
      } catch (e) {
        setHasOnboarded(false);
      }
    };
    checkOnboarding();
  }, []);

  // Masquer le splash et naviguer
  useEffect(() => {
    if (showSplash) {
      // Masquer le splash natif dès que le custom est prêt à s'afficher
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [showSplash]);

  // Affichage du splash custom (utilisé aussi comme loading)
  if (showSplash || !isReady || hasOnboarded === null) {
    return (
      <CustomSplashScreen 
        isDataReady={isReady && hasOnboarded !== null} 
        onFinish={() => setShowSplash(false)} 
      />
    );
  }

  // App principal
  return (
    <TransitionOverlay watch={[theme, locale]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
      <ConnectivityBanner />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="book/[id]"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
      </Stack>
    </TransitionOverlay>
  );
}

export default function RootLayout() {
  useEffect(() => {
    activateKeepAwakeAsync().catch(() => {
      console.log('KeepAwake non activable dans cet environnement.');
    });
    // Connexion permanente au webhook Push Notification OTA
    SocketService.init();

    return () => {
      SocketService.disconnect();
    };
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <ConnectivityProvider>
          <ModalProvider>
            <RootLayoutContent />
          </ModalProvider>
        </ConnectivityProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
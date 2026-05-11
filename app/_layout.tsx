import React, { useState, useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
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
import { AuthProvider, useAuth } from '@/core/context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { TransitionOverlay } from '@/components/TransitionOverlay';
import { CustomSplashScreen } from '@/components/CustomSplashScreen';
import { SocketService } from '@/core/services/socketService';
import { UpdateService, AppUpdateData } from '@/core/services/updateService';
// import { pushNotificationService } from '@/core/services/pushNotificationService';
// import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//     shouldShowBanner: true,
//     shouldShowList: true,
//   }),
// });

// Empêche l'auto-hide du splash natif
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutContent() {
  const { theme, colors } = useTheme();
  const { isReady, locale } = useTranslation();
  const [showSplash, setShowSplash] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading } = useAuth();

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

  // Redirection automatique globale (Auth Guard)
  useEffect(() => {
    if (isLoading || hasOnboarded === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!hasOnboarded && segments[0] !== 'onboarding') {
      router.replace('/onboarding');
    } else if (hasOnboarded && !user && !inAuthGroup && segments[0] !== 'onboarding') {
      router.replace('/(auth)/login');
    } else if (hasOnboarded && user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, hasOnboarded, segments]);

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

      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)/login" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(auth)/register" />
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

    // Enregistrement pour les notifications Push (Nouvel upload, etc.)
    // pushNotificationService.registerForPushNotificationsAsync().catch(e => {
    //    console.log('[RootLayout] Erreur init push:', e);
    // });

    const unsubscribe = SocketService.subscribeToAppUpdates((data: AppUpdateData) => {
      const CURRENT_VERSION = Constants.expoConfig?.version || (Constants as any).manifest?.version || '1.0.0';
      if (UpdateService.isNewerVersion(CURRENT_VERSION, data.version)) {
        // Notifications.requestPermissionsAsync().then(({ status }) => {
        //   if (status === 'granted') {
        //     Notifications.scheduleNotificationAsync({
        //       content: {
        //         title: "Mise à jour disponible 🚀",
        //         body: `La nouvelle version ${data.version} de ZaraBook est prête à être installée.`,
        //         data: { downloadUrl: data.downloadUrl },
        //       },
        //       trigger: null,
        //     });
        //   }
        // });
      }
    });

    return () => {
      unsubscribe();
      SocketService.disconnect();
    };
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ConnectivityProvider>
            <ModalProvider>
              <RootLayoutContent />
            </ModalProvider>
          </ConnectivityProvider>
        </AuthProvider>
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
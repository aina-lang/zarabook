
import { Stack } from 'expo-router';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#0d0f14" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="book/[id]"
          options={{
            headerShown: true,
            presentation: 'modal',
            headerStyle: { backgroundColor: '#0d0f14' },
            headerTintColor: '#f97316',
            headerTitle: '',
          }}
        />
        <Stack.Screen
          name="my-id"
          options={{
            headerShown: true,
            presentation: 'modal',
            headerStyle: { backgroundColor: '#0d0f14' },
            headerTintColor: '#f97316',
            headerTitle: 'Mon Profil Telegram',
          }}
        />
        <Stack.Screen
          name="scan-peer"
          options={{
            headerShown: true,
            presentation: 'modal',
            headerStyle: { backgroundColor: '#0d0f14' },
            headerTintColor: '#f97316',
            headerTitle: 'Scanner un Contact',
          }}
        />

      </Stack>
    </>
  );
}

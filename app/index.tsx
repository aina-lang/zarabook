import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View } from 'react-native';

export default function Index() {
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkOnboarding = async () => {
      try {
        const val = await AsyncStorage.getItem('hasCompletedOnboarding');
        if (mounted) setHasOnboarded(val === 'true');
      } catch (e) {
        if (mounted) setHasOnboarded(false);
      }
    };
    checkOnboarding();
    
    return () => { mounted = false; };
  }, []);

  if (hasOnboarded === null) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (hasOnboarded) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/onboarding" />;
  }
}

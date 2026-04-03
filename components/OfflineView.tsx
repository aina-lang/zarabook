import React from 'react';
import { View, Text } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useTheme } from '@/core/context/ThemeContext';

export const OfflineView = () => {
  const { colors } = useTheme();
  
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <WifiOff size={40} color={colors.textMuted} />
      </View>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>Aucune Connexion</Text>
      <Text style={{ color: colors.textDim, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
        Vous êtes actuellement hors ligne. Vérifiez votre connexion internet pour accéder au catalogue.
      </Text>
    </View>
  );
};

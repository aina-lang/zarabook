import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Library, Globe, Users, Download } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { View, Text, StyleSheet } from 'react-native';
import { DownloadStore } from '@/core/store/downloadStore';

function DownloadBadge({ color }: { color: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => {
      const active = DownloadStore.getAll().filter(d => d.status === 'downloading' || d.status === 'pending').length;
      setCount(active);
    };
    update();
    return DownloadStore.subscribe(update);
  }, []);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Download size={24} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const C = Colors.dark;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.tint,
        tabBarInactiveTintColor: C.tabIconDefault,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: C.background },
        headerTitleStyle: { color: C.text, fontWeight: 'bold', fontSize: 18 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color }) => <Globe size={24} color={color} />,
          headerTitle: '📡 BookMesh',
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ma Lib',
          tabBarIcon: ({ color }) => <Library size={24} color={color} />,
          headerTitle: 'Ma Bibliothèque',
        }}
      />
      <Tabs.Screen
        name="peers"
        options={{
          title: 'Réseau',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
          headerTitle: 'Le Réseau BookMesh',
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: 'DL',
          tabBarIcon: ({ color }) => <DownloadBadge color={color} />,
          headerTitle: 'Téléchargements',
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#f97316',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

import '@/core/polyfills';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import { createNode } from '@/core/libp2p';
import { CatalogService } from '@/services/catalogService';
import { DiscoveryService } from '@/services/discoveryService';
import { TransferProtocol } from '@/services/transferProtocol';
import { NodeProvider } from '@/core/NodeContext';
import { StatusBar } from 'expo-status-bar';
import type { Libp2p } from 'libp2p';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [node, setNode] = useState<Libp2p | null>(null);
  const [peerId, setPeerId] = useState<string>('');
  // Use a ref for cleanup so it always has the latest node
  const nodeRef = useRef<Libp2p | null>(null);

  useEffect(() => {
    async function initP2P() {
      try {
        const libp2pNode = await createNode();
        await libp2pNode.start();

        const catalog = new CatalogService(libp2pNode);
        const discovery = new DiscoveryService(libp2pNode);
        const transfer = new TransferProtocol(libp2pNode);

        await catalog.start();
        await discovery.start();
        await transfer.start();

        nodeRef.current = libp2pNode;
        const id = libp2pNode.peerId.toString();
        setNode(libp2pNode);
        setPeerId(id);
        console.log('[BookMesh] Node started:', id);

        // Announce our books to the network after a short delay
        setTimeout(() => catalog.announceAllPublicBooks(), 3000);
      } catch (e) {
        console.warn('[BookMesh] Failed to start P2P node', e);
      } finally {
        SplashScreen.hideAsync();
      }
    }

    initP2P();

    return () => {
      nodeRef.current?.stop();
    };
  }, []);

  return (
    <NodeProvider node={node} peerId={peerId}>
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
            headerTitle: 'Mon Identité P2P',
          }}
        />
        <Stack.Screen
          name="scan-peer"
          options={{
            headerShown: true,
            presentation: 'modal',
            headerStyle: { backgroundColor: '#0d0f14' },
            headerTintColor: '#f97316',
            headerTitle: 'Scanner un Pair',
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </NodeProvider>
  );
}

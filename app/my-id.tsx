import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Share, TouchableOpacity, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useNode, usePeerId } from '@/core/NodeContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Share as ShareIcon, Smartphone } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

const C = Colors.dark;

export default function MyIdScreen() {
  const node = useNode();
  const myPeerId = usePeerId();
  
  const addresses = node?.getMultiaddrs() || [];
  const qrData = addresses.length > 0 
    ? JSON.stringify(addresses.map((a:any) => a.toString()))
    : myPeerId || '';

  const handleShare = async () => {
    try {
      await Share.share({
        message: qrData,
        title: 'BookMesh Peer Address',
      });
    } catch (error: any) {
      console.error('Error sharing:', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.container}>
      <ThemedView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Smartphone size={24} color={C.tint} />
            <ThemedText type="defaultSemiBold" style={{ marginLeft: 10, color: C.text }}>Mon Identité P2P</ThemedText>
          </View>
          
          <View style={styles.qrContainer}>
            {qrData ? (
              <QRCode value={qrData} size={220} backgroundColor="white" />
            ) : (
              <ActivityIndicator size="large" color={C.tint} />
            )}
          </View>
          
          <ThemedText style={styles.hintText}>
            {addresses.length > 0 
              ? "D'autres utilisateurs peuvent scanner ce code pour se connecter directement à vous."
              : "Identité détectée. En attente d'adresses réseau pour une connexion directe..."}
          </ThemedText>
          
          {qrData ? (
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <ShareIcon size={18} color="#fff" />
              <Text style={styles.shareBtnText}>Partager mon Identité</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Détails techniques</Text>
          {addresses.map((addr: any, i: number) => (
            <Text key={i} style={styles.addressText} numberOfLines={1}>
              {addr.toString()}
            </Text>
          ))}
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  scrollContent: { paddingVertical: 20 },
  content: { flex: 1, padding: 16, gap: 20 },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  hintText: {
    fontSize: 14,
    textAlign: 'center',
    color: C.muted,
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  shareBtn: {
    backgroundColor: C.tint,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  shareBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  infoBox: {
    padding: 16,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoTitle: { color: C.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  addressText: { color: C.muted, fontSize: 10, fontFamily: 'monospace', marginBottom: 4 },
});

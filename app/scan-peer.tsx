import React, { useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNode } from '@/core/NodeContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { multiaddr } from '@multiformats/multiaddr';
import { Camera, CheckCircle, RefreshCw } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';

const C = Colors.dark;

export default function ScanPeerScreen() {
  const node = useNode();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!node) return;
    setScanned(true);
    setConnectionStatus('Connexion au pair...');
    setStatusType('info');
    
    try {
      let peerAddresses: string[] = [];
      try {
        peerAddresses = JSON.parse(data);
      } catch (e) {
        if (typeof data === 'string' && data.length > 0) {
          if (!data.startsWith('/')) {
            peerAddresses = [`/p2p/${data}`];
          } else {
            peerAddresses = [data];
          }
        }
      }

      if (peerAddresses.length > 0) {
        const ma = multiaddr(peerAddresses[0]);
        await node.dial(ma);
        setConnectionStatus('Connecté avec succès !');
        setStatusType('success');
        setTimeout(() => router.back(), 1500);
      } else {
        setConnectionStatus('Aucune adresse valide trouvée.');
        setStatusType('error');
        setTimeout(() => setScanned(false), 3000);
      }
    } catch (error: any) {
      setConnectionStatus(`Échec de la connexion : ${error.message}`);
      setStatusType('error');
      setTimeout(() => setScanned(false), 3000);
    }
  };

  if (!permission) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={C.tint} />
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <Camera size={64} color={C.border} style={{ marginBottom: 20 }} />
        <ThemedText style={styles.textCenter}>Nous avons besoin de votre permission pour utiliser la caméra.</ThemedText>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <ThemedText style={styles.buttonText}>Autoriser la caméra</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={{ color: C.text }}>Scanner un pair</ThemedText>
        <ThemedText style={styles.subtitle}>Pointe ta caméra vers le code d'un autre utilisateur BookMesh.</ThemedText>
      </View>

      <View style={styles.cameraContainer}>
        <View style={styles.cameraWrapper}>
          <CameraView 
            style={styles.camera} 
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
          {scanned && (
            <View style={styles.scanningOverlay}>
              {statusType === 'success' ? (
                <CheckCircle size={60} color={C.success} />
              ) : (
                <RefreshCw size={50} color="#fff" />
              )}
            </View>
          )}
        </View>
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
      </View>

      {connectionStatus ? (
        <View style={[styles.statusBanner, 
          statusType === 'success' ? styles.successStatus : 
          statusType === 'error' ? styles.errorStatus : styles.infoStatus]}>
          <Text style={styles.statusText}>{connectionStatus}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Annuler</Text>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background, padding: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: 40, marginBottom: 40, alignItems: 'center' },
  subtitle: { color: C.muted, fontSize: 14, textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },
  cameraContainer: {
    alignSelf: 'center',
    width: 280,
    height: 280,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraWrapper: {
    width: 260,
    height: 260,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: { flex: 1 },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: C.tint, borderTopLeftRadius: 24 },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: C.tint, borderTopRightRadius: 24 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: C.tint, borderBottomLeftRadius: 24 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: C.tint, borderBottomRightRadius: 24 },
  statusBanner: {
    marginTop: 40,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  statusText: { color: '#fff', fontWeight: 'bold' },
  infoStatus: { backgroundColor: C.tint },
  successStatus: { backgroundColor: C.success },
  errorStatus: { backgroundColor: C.error || '#ef4444' },
  primaryButton: { backgroundColor: C.tint, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 14, marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  textCenter: { textAlign: 'center', color: C.text },
  cancelBtn: { marginTop: 'auto', marginBottom: 20, alignSelf: 'center' },
  cancelText: { color: C.muted, fontSize: 16, fontWeight: '600' },
});

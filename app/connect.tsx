import React, { useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Share, TouchableOpacity, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { useNode } from '@/core/NodeContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { multiaddr } from '@multiformats/multiaddr';
import { Share as ShareIcon, Camera, CheckCircle, RefreshCw, Smartphone } from 'lucide-react-native';

export default function ConnectScreen() {
  const node = useNode();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  
  const addresses = node?.getMultiaddrs() || [];
  const qrData = JSON.stringify(addresses.map((a:any) => a.toString()));

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
      } else {
        setConnectionStatus('Aucune adresse valide trouvée.');
        setStatusType('error');
      }
    } catch (error: any) {
      console.error('Failed to dial peer QR code', error);
      setConnectionStatus(`Échec de la connexion : ${error.message}`);
      setStatusType('error');
    }
    
    setTimeout(() => {
      setScanned(false);
      setConnectionStatus('');
    }, 5000);
  };

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

  if (!permission) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centeredContent}>
          <Camera size={64} color="#ccc" style={{ marginBottom: 20 }} />
          <ThemedText style={styles.textCenter}>Nous avons besoin de votre permission pour utiliser la caméra et scanner les pairs.</ThemedText>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <ThemedText style={styles.buttonText}>Autoriser la caméra</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  const statusStyles = statusType === 'success' ? styles.successStatus : 
                      statusType === 'error' ? styles.errorStatus : styles.infoStatus;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Smartphone size={24} color="#0a7ea4" />
            <ThemedText type="defaultSemiBold" style={{ marginLeft: 10 }}>Mon Identité P2P</ThemedText>
          </View>
          
          <View style={styles.qrContainer}>
            {addresses.length > 0 ? (
              <QRCode value={qrData} size={180} backgroundColor="white" />
            ) : (
              <ActivityIndicator size="large" color="#0a7ea4" />
            )}
          </View>
          
          <ThemedText style={styles.hintText}>Scanne ce code depuis un autre appareil pour établir une connexion P2P directe.</ThemedText>
          
          {addresses.length > 0 && (
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <ShareIcon size={18} color="#fff" />
              <Text style={styles.shareBtnText}>Partager mon ID</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Camera size={24} color="#0a7ea4" />
            <ThemedText type="defaultSemiBold" style={{ marginLeft: 10 }}>Se connecter à un pair</ThemedText>
          </View>
          
          <View style={styles.cameraWrapper}>
            <CameraView 
              style={styles.camera} 
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            />
            {scanned && (
              <View style={styles.scanningOverlay}>
                <RefreshCw size={40} color="#fff" />
              </View>
            )}
          </View>
          
          <ThemedText style={styles.hintText}>Pointe ta caméra vers le code d'un autre utilisateur pour rejoindre le réseau BookMesh.</ThemedText>
        </View>

        {connectionStatus ? (
          <View style={[styles.statusBanner, statusStyles]}>
            {statusType === 'success' && <CheckCircle size={18} color="#fff" style={{marginRight: 8}} />}
            <Text style={styles.statusText}>{connectionStatus}</Text>
          </View>
        ) : null}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 20,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  card: {
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraWrapper: {
    width: 220,
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#0a7ea4',
    marginBottom: 16,
  },
  camera: {
    flex: 1,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintText: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 18,
    marginBottom: 16,
  },
  shareBtn: {
    backgroundColor: '#0a7ea4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  shareBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  textCenter: {
    textAlign: 'center',
    lineHeight: 22,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  infoStatus: { backgroundColor: '#0a7ea4' },
  successStatus: { backgroundColor: '#4CAF50' },
  errorStatus: { backgroundColor: '#f44336' },
});


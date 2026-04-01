import { Libp2p } from 'libp2p';
import { Storage } from '../core/storage/storage';

export class DiscoveryService {
  private node: Libp2p;

  constructor(node: Libp2p) {
    this.node = node;
  }

  async start() {
    this.node.addEventListener('peer:discovery', async (evt) => {
      const peerId = evt.detail.id.toString();
      const multiaddrs = evt.detail.multiaddrs.map(ma => ma.toString());
      
      console.log(`[Discovery] Found peer: ${peerId}`);
      
      await Storage.savePeer({
        id: peerId,
        multiaddrs: multiaddrs,
        lastSeen: Date.now()
      });
    });

    this.node.addEventListener('peer:connect', (evt) => {
      console.log(`[Discovery] Connected to: ${evt.detail.toString()}`);
    });
  }

  // Support manual connection via QR code string
  async connectToPeer(multiaddr: string) {
    try {
      await this.node.dial(multiaddr as any);
      console.log(`[Discovery] Manually connected to ${multiaddr}`);
    } catch (err) {
      console.error(`[Discovery] Failed to connect to ${multiaddr}`, err);
    }
  }
}

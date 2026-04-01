import React, { createContext, useContext } from 'react';
import type { Libp2p } from 'libp2p';

interface NodeContextType {
  node: Libp2p | null;
  peerId: string;
}

const NodeContext = createContext<NodeContextType>({ node: null, peerId: '' });

export function NodeProvider({
  children,
  node,
  peerId,
}: {
  children: React.ReactNode;
  node: Libp2p | null;
  peerId: string;
}) {
  return (
    <NodeContext.Provider value={{ node, peerId }}>
      {children}
    </NodeContext.Provider>
  );
}

export function useNode(): Libp2p | null {
  return useContext(NodeContext).node;
}

export function usePeerId(): string {
  return useContext(NodeContext).peerId;
}

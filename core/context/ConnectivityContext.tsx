import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface ConnectivityContextType {
  isOffline: boolean;
  isWifi: boolean;
  connectionType: string | null;
}

const ConnectivityContext = createContext<ConnectivityContextType>({
  isOffline: false,
  isWifi: false,
  connectionType: null,
});

export const ConnectivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ConnectivityContextType>({
    isOffline: false,
    isWifi: false,
    connectionType: null,
  });

  useEffect(() => {
    const removeSubscription = NetInfo.addEventListener((state) => {
      setStatus({
        isOffline: state.isConnected === false,
        isWifi: state.type === 'wifi',
        connectionType: state.type,
      });
    });

    return () => removeSubscription();
  }, []);

  return (
    <ConnectivityContext.Provider value={status}>
      {children}
    </ConnectivityContext.Provider>
  );
};

export const useConnectivity = () => useContext(ConnectivityContext);

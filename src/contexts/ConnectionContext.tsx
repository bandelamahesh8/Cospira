/// <reference types="vite/client" />
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { SignalingService } from '@/services/SignalingService';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';

interface ConnectionContextType {
  isConnected: boolean;
  socket: SignalingService | null;
  error: string | null;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signalingRef = useRef<SignalingService | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    let wsUrl = import.meta.env.VITE_WS_URL;
    const { hostname, origin } = window.location;

    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isLanIp =
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      (hostname.startsWith('172.') &&
        parseInt(hostname.split('.')[1]) >= 16 &&
        parseInt(hostname.split('.')[1]) <= 31);

    if (isLocalHost) {
      // Use origin to leverage Vite proxy for /socket.io
      wsUrl = origin; 
    } else if (isLanIp || !wsUrl) {
      wsUrl = origin;
    }
    wsUrl = wsUrl || origin || 'https://localhost:3001';

    if (window.location.protocol === 'https:' && wsUrl.startsWith('http:')) {
      wsUrl = wsUrl.replace('http:', 'https:');
    }

    logger.info('Initializing Connection Context:', wsUrl);
    const signaling = new SignalingService(wsUrl);
    signalingRef.current = signaling;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onError = (err: Error | string) => setError(String(err));

    signaling.on('connect', onConnect);
    signaling.on('disconnect', onDisconnect);
    signaling.on('connect_error', onError);

    try {
      signaling.connect(session?.access_token);
    } catch (err) {
      setError(String(err));
    }

    return () => {
      signaling.off('connect', onConnect);
      signaling.off('disconnect', onDisconnect);
      signaling.off('connect_error', onError);
      signaling.disconnect();
    };
  }, [session?.access_token]);

  return (
    <ConnectionContext.Provider value={{ isConnected, socket: signalingRef.current, error }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) throw new Error('useConnection must be used within ConnectionProvider');
  return context;
};

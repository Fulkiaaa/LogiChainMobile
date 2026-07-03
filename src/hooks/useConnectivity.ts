import {useEffect, useState} from 'react';
import NetInfo from '@react-native-community/netinfo';

/** Écoute l'état réseau (online/offline) sans polling. */
export function useConnectivity(): {online: boolean} {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setOnline(Boolean(state.isConnected));
    });
    return () => unsub();
  }, []);
  return {online};
}

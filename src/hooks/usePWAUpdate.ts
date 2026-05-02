import { useState, useEffect } from 'react';

declare global {
  interface Window {
    workbox?: any;
  }
}

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    // Escuchar actualizaciones del service worker
    const handleUpdate = () => {
      setUpdateAvailable(true);
    };

    const handleControllerChange = () => {
      setUpdateReady(true);
    };

    // Escuchar evento de actualización disponible
    window.addEventListener('sw:registered', handleUpdate);
    window.addEventListener('sw:updated', handleControllerChange);

    // Verificar si hay una actualización pendiente al cargar
    if ('serviceWorker' in navigator && window.workbox) {
      window.workbox.addEventListener('controlling', () => {
        setUpdateReady(true);
      });
      
      window.workbox.addEventListener('waiting', () => {
        setUpdateAvailable(true);
      });
    }

    return () => {
      window.removeEventListener('sw:registered', handleUpdate);
      window.removeEventListener('sw:updated', handleControllerChange);
    };
  }, []);

  const updateApp = () => {
    if ('serviceWorker' in navigator && window.workbox) {
      window.workbox.addEventListener('controlling', () => {
        window.location.reload();
      });
      window.workbox.messageSkipWaiting();
    } else {
      window.location.reload();
    }
  };

  return {
    updateAvailable,
    updateReady,
    updateApp
  };
}

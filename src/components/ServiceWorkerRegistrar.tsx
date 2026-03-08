'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[SW] Registrado com sucesso:', registration.scope);

            // Verifica atualizações a cada 60s
            setInterval(() => {
              registration.update();
            }, 60 * 1000);
          })
          .catch((error) => {
            console.error('[SW] Falha no registro:', error);
          });
      });
    }
  }, []);

  return null;
}

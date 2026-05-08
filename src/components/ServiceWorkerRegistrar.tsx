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

            // Escuta por novos service workers aguardando ativação
            registration.onupdatefound = () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.onstatechange = () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Novo conteúdo disponível, recarrega para aplicar
                    console.log('[SW] Novo conteúdo detectado, recarregando...');
                    window.location.reload();
                  }
                };
              }
            };

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

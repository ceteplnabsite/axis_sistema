// Service Worker Simplificado - Sem Cache Agressivo
// O objetivo é não guardar cache de páginas ou dados (RSC/Next.js) para evitar informações desatualizadas.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Ao ativar, limpa TODOS os caches antigos que possam ter ficado presos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Não intercepta nenhuma requisição, deixando o browser/Next.js gerenciar nativamente.
// Isso previne que o SW sirva conteúdo antigo.
self.addEventListener('fetch', (event) => {
  return;
});

// Push Notifications (para uso futuro)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Áxis', {
      body: data.body || '',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});

/* Pengganti service worker aplikasi lama (MADIS lama mendaftarkan /sw.js dengan cache agresif).
   Browser yang masih memegang versi lama akan memuat berkas ini, menghapus cache lama, lalu mencopot dirinya sendiri. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => client.navigate(client.url));
  })());
});

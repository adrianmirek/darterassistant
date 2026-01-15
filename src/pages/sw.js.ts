export const prerender = false;

export async function GET() {
  const swContent = `
// Development Service Worker for Darter Assistant PWA
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple fetch passthrough for dev mode
  event.respondWith(fetch(event.request));
});
`;

  return new Response(swContent, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache",
    },
  });
}

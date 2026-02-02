// =============== Service Worker for Tax Calculator PWA ===============
// Version: 2569.1.0

const CACHE_NAME = 'tax-calculator-v2569-1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline use
const CACHE_FILES = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/export-pdf.js',
    '/salary-slips.html',
    '/salary-slips.js',
    '/manifest.json',
    '/offline.html',
    // Icons
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    // External CDN (Chart.js) - will be cached on first use
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell...');
                // Cache files one by one to handle missing files gracefully
                return Promise.allSettled(
                    CACHE_FILES.map(file =>
                        cache.add(file).catch(err => {
                            console.warn(`[SW] Failed to cache: ${file}`, err);
                        })
                    )
                );
            })
            .then(() => {
                console.log('[SW] App shell cached successfully');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log(`[SW] Deleting old cache: ${name}`);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests except for CDN resources
    const url = new URL(event.request.url);
    const isSameOrigin = url.origin === self.location.origin;
    const isCDN = url.hostname.includes('cdn.jsdelivr.net') ||
                  url.hostname.includes('cdnjs.cloudflare.com');

    if (!isSameOrigin && !isCDN) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached version if available
                if (cachedResponse) {
                    // Update cache in background (stale-while-revalidate)
                    event.waitUntil(
                        fetch(event.request)
                            .then((networkResponse) => {
                                if (networkResponse && networkResponse.status === 200) {
                                    caches.open(CACHE_NAME)
                                        .then((cache) => {
                                            cache.put(event.request, networkResponse);
                                        });
                                }
                            })
                            .catch(() => {
                                // Network failed, but we have cache, so it's ok
                            })
                    );
                    return cachedResponse;
                }

                // No cache, try network
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Cache successful responses
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('[SW] Fetch failed:', error);

                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }

                        // Return a simple error response for other requests
                        return new Response('Offline - Content not available', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// Background sync for future features
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        console.log('[SW] Background sync triggered');
        // Future: Sync user data to backend
    }
});

// Push notifications for future features
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body || 'มีการอัพเดทใหม่',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/'
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'คำนวณภาษี 2569', options)
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing window if available
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

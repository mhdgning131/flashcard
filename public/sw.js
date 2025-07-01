const CACHE_NAME = 'ai-flashcards-v1.0.0';
const STATIC_CACHE = 'ai-flashcards-static-v1.0.0';
const DYNAMIC_CACHE = 'ai-flashcards-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  // Add key JavaScript and CSS files
  '/src/index.tsx',
  '/src/App.tsx',
  // External resources that are critical
  'https://cdn.tailwindcss.com',
  'https://rsms.me/inter/inter-var.woff2'
];

// Dynamic cache patterns
const CACHE_PATTERNS = [
  /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
  /^https:\/\/cdn\.tailwindcss\.com/,
  /^https:\/\/rsms\.me\/inter/,
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(?:js|css|woff|woff2|ttf|eot)$/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES.map(url => new Request(url, { credentials: 'same-origin' })));
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip API calls (let them go to network)
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Skip external analytics and tracking
  if (url.hostname.includes('google-analytics.com') || 
      url.hostname.includes('googletagmanager.com') ||
      url.hostname.includes('hotjar.com') ||
      url.hostname.includes('clarity.ms')) {
    return;
  }
  
  event.respondWith(
    handleRequest(request)
  );
});

// Handle different types of requests
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // For navigation requests, use cache-first for static files, network-first for app
    if (request.mode === 'navigate') {
      return await handleNavigationRequest(request);
    }
    
    // For static resources, use cache-first strategy
    if (CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
      return await handleStaticRequest(request);
    }
    
    // For other requests, use network-first strategy
    return await handleDynamicRequest(request);
    
  } catch (error) {
    console.warn('Service Worker: Request failed:', error);
    return await handleOfflineFallback(request);
  }
}

// Handle navigation requests (HTML pages)
async function handleNavigationRequest(request) {
  try {
    // Try network first for fresh content
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Ultimate fallback to root page
    const rootResponse = await caches.match('/');
    if (rootResponse) {
      return rootResponse;
    }
    
    // If all else fails, return offline page
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - AI Flashcard Generator</title>
        <style>
          body { 
            font-family: system-ui, sans-serif; 
            text-align: center; 
            padding: 2rem; 
            background: linear-gradient(135deg, #1e293b, #334155);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
          }
          .container { max-width: 500px; }
          h1 { font-size: 2.5rem; margin-bottom: 1rem; }
          p { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9; }
          button { 
            background: #3b82f6; 
            color: white; 
            border: none; 
            padding: 1rem 2rem; 
            border-radius: 0.5rem; 
            font-size: 1rem; 
            cursor: pointer;
            transition: background 0.2s;
          }
          button:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📚 You're Offline</h1>
          <p>No internet connection detected. Some features may be limited, but you can still use cached flashcards.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </div>
      </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
}

// Handle static resource requests (cache-first)
async function handleStaticRequest(request) {
  // Check cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If not in cache, fetch from network and cache
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    // Return a placeholder for failed static resources
    if (request.url.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/)) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#e5e7eb"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">Image</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// Handle dynamic requests (network-first)
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Handle offline fallback
async function handleOfflineFallback(request) {
  // For images, return placeholder
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#6b7280">📷</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
  
  // For other requests, return error response
  return new Response(
    JSON.stringify({ error: 'Offline - Please check your connection' }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background sync operations
      syncData()
    );
  }
});

async function syncData() {
  try {
    // Sync any pending data when online
    console.log('Service Worker: Syncing data...');
    
    // You could sync user data, analytics, etc. here
    // For now, just clean up old cache entries
    await cleanOldCacheEntries();
    
  } catch (error) {
    console.error('Service Worker: Sync failed:', error);
  }
}

async function cleanOldCacheEntries() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const requests = await cache.keys();
  
  // Remove entries older than 24 hours
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const dateHeader = response.headers.get('date');
      if (dateHeader && new Date(dateHeader).getTime() < oneDayAgo) {
        await cache.delete(request);
      }
    }
  }
}

// Push notification handling (for future features)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'New flashcards available!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Flashcards',
        icon: '/icons/action-explore.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/action-close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('AI Flashcard Generator', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
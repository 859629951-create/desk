// 今日有雨 Service Worker
const CACHE_NAME = 'desk-v11';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/base.css',
  './styles/app.css',
  './scripts/db.js',
  './scripts/ai.js',
  './scripts/app.js',
  './scripts/router.js',
  './scripts/notify.js',
  './modules/home.js',
  './modules/more.js',
  './modules/study.js',
  './modules/punch.js',
  './modules/travel.js',
  './modules/interest.js',
  './modules/recipe.js',
  './modules/account.js',
  './modules/work.js',
  './modules/museum.js',
  './modules/pet.js',
  './modules/settings.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 网络优先，失败回退缓存（适合 PWA 更新 + 离线可用）
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});

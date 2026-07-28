// 今日有雨 Service Worker
const CACHE_NAME = 'desk-v27';

// 核心资源（安装时预缓存）
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  // styles
  './styles/base.css',
  './styles/app.css',
  // scripts
  './scripts/db.js',
  './scripts/ai.js',
  './scripts/app.js',
  './scripts/router.js',
  './scripts/notify.js',
  // modules
  './modules/home.js',
  './modules/more.js',
  './modules/study.js',
  './modules/study-center.js',
  './modules/punch.js',
  './modules/travel.js',
  './modules/interest.js',
  './modules/recipe.js',
  './modules/account.js',
  './modules/work.js',
  './modules/museum.js',
  './modules/pet.js',
  './modules/settings.js',
  // icons
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// 去除 URL query string，用于缓存匹配
function stripQuery(url) {
  try {
    const u = new URL(url);
    u.search = '';
    return u.toString();
  } catch {
    return url;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 安装时把带版本号的 URL 也缓存一份（与 index.html 实际请求一致）
      const withVersion = CORE_ASSETS.map((url) => {
        if (url.startsWith('./') && url !== './' && url !== './index.html' && url !== './manifest.json') {
          return [`${url}?v=27`, url];
        }
        return [url];
      }).flat();
      return cache.addAll(withVersion).catch(() => {});
    })
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

  const url = stripQuery(req.url);

  // 网络优先，失败回退缓存（带 query string 兼容）
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // 存储时去掉 query string，统一用干净的 URL
          cache.put(new Request(url), copy);
        }).catch(() => {});
        return res;
      })
      .catch(() => {
        // 离线：先精确匹配，再用无 query 的 URL 匹配
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          return caches.match(new Request(url));
        }).then((cached) => {
          // HTML 导航请求 fallback 到 index.html
          if (!cached && req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return cached || caches.match('./index.html');
        });
      })
  );
});

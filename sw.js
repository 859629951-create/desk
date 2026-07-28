// 今日有雨 Service Worker v3 - 健壮版 + Share Target
const CACHE_NAME = 'desk-v30';

// 核心资源列表
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
  './modules/study-center.js',
  './modules/punch.js',
  './modules/travel.js',
  './modules/interest.js',
  './modules/recipe.js',
  './modules/account.js',
  './modules/work.js',
  './modules/museum.js',
  './modules/pet.js',
  './modules/knowledge.js',
  './modules/settings.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './share-target.html'
];

// 逐个缓存，避免一个失败导致全部不缓存
async function cacheIndividually(cache, urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (res.ok) {
        await cache.put(new Request(url), res);
      }
    } catch (e) {
      // 单个失败不影响其他
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 1. 先缓存 index.html（最高优先级）
      try {
        const indexRes = await fetch('./index.html', { cache: 'no-cache' });
        if (indexRes.ok) {
          await cache.put(new Request('./index.html'), indexRes);
          await cache.put(new Request('./'), indexRes.clone());
        }
      } catch (e) {}
      // 2. 逐个缓存其他资源
      await cacheIndividually(cache, CORE_ASSETS.filter(u => u !== './' && u !== './index.html'));
      // 3. 立即激活
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 删除旧缓存
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      // 立即接管所有客户端
      await self.clients.claim();
    })()
  );
});

// 去除 URL query string
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.search = '';
    return u.toString();
  } catch {
    return url;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // ====== Share Target：处理 POST 分享请求 ======
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/share-target.html')) {
    event.respondWith(handleShare(req));
    return;
  }

  if (req.method !== 'GET') return;

  const isNavigation = req.mode === 'navigate';
  const cleanUrl = normalizeUrl(req.url);

  if (isNavigation) {
    // HTML 导航请求：cache-first（离线优先，确保 PWA 能打开）
    event.respondWith(
      (async () => {
        // 先查缓存
        const cached = await caches.match(req) || await caches.match(new Request(cleanUrl)) || await caches.match('./index.html');
        if (cached) {
          // 后台更新缓存
          fetch(req).then(res => {
            if (res.ok) {
              caches.open(CACHE_NAME).then(c => c.put(new Request('./index.html'), res));
            }
          }).catch(() => {});
          return cached;
        }
        // 缓存没有，尝试网络
        try {
          const res = await fetch(req);
          if (res.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(new Request('./index.html'), res.clone());
            await cache.put(new Request('./'), res.clone());
          }
          return res;
        } catch (e) {
          // 最终 fallback
          return caches.match('./index.html');
        }
      })()
    );
  } else {
    // 静态资源：stale-while-revalidate
    event.respondWith(
      (async () => {
        const cached = await caches.match(req) || await caches.match(new Request(cleanUrl));
        const fetchPromise = fetch(req).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(new Request(cleanUrl), clone));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })()
    );
  }
});

// ====== Share Target 处理函数 ======
async function handleShare(req) {
  const formData = await req.formData();
  const title = formData.get('title') || '';
  const text = formData.get('text') || '';
  const url = formData.get('url') || '';

  // 把分享数据存入 sessionStorage（通过 redirect GET 传递）
  // 由于 SW 无法直接写 sessionStorage，用 URL 参数传递
  const params = new URLSearchParams();
  if (title) params.set('title', title);
  if (text) params.set('text', text);
  if (url) params.set('url', url);

  // 302 重定向到 GET share-target.html?title=...&text=...&url=...
  return Response.redirect(`./share-target.html?${params.toString()}`, 303);
}

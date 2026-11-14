/* 離線快取：第一次開啟時把所有檔案存到手機，之後完全不需要網路 */
const CACHE = 'kids-english-v7';
const FILES = ['./', './manifest.json', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];
/* 有些主機（如 Cloudflare Pages）會把 index.html 轉址，轉址過的回應不能直接拿來開頁面，要重新包裝 */
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { headers: res.headers, status: res.status, statusText: res.statusText });
}
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(u =>
    fetch(u, { cache: 'reload' }).then(clean).then(r => c.put(u, r))
  ))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  /* 開啟頁面（含從主畫面圖示啟動）：一律用快取裡的首頁，沒網路也能開 */
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./').then(hit => hit || fetch(req).then(clean)).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(clean).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});

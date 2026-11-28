const V = 'shefa-c8';
const CORE = ['./', 'ddi.json', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const same = (u) => new URL(u, self.location.href).origin === self.location.origin;
async function put(c, url, res) { if (res && res.status === 200) await c.put(url, res.clone()); return res; }
async function precache() {
  const c = await caches.open(V);
  const seen = new Set();
  const grab = async (u) => {
    const abs = new URL(u, self.location.href).href; if (seen.has(abs) || !same(abs)) return;
    seen.add(abs);
    try {
      const r = await fetch(abs, { cache: 'reload' }); if (r.status !== 200) return; await c.put(abs, r.clone());
      if (/\.js$/.test(abs)) { const t = await r.text(); const base = abs.slice(0, abs.lastIndexOf('/') + 1); const ms = [...t.matchAll(/["'`]\.\/([A-Za-z0-9_.-]+\.(?:js|css|json))["'`]/g)].map((m) => base + m[1]); await Promise.all(ms.map(grab)); }
    } catch (e) { /* offline copy is best effort */ }
  };
  try {
    const r = await fetch('./', { cache: 'reload' });
    if (r.status === 200) { await c.put(new URL('./', self.location.href).href, r.clone()); const t = await r.text(); const us = [...t.matchAll(/(?:src|href)="([^"#]+)"/g)].map((m) => m[1]); await Promise.all(us.map(grab)); }
  } catch (e) { /* ignore */ }
  await Promise.all(CORE.map(grab));
}
self.addEventListener('install', (e) => { e.waitUntil(precache().then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k.startsWith('shefa-')).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const q = e.request; if (q.method !== 'GET' || !same(q.url)) return;
  const u = new URL(q.url);
  if (q.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(V);
      const home = new URL('./', self.location.href).href; const cached = await c.match(home);
      const net = fetch(q).then((r) => { put(c, home, r); return r; });
      if (!cached) { try { return await net; } catch (x) { return Response.error(); } }
      // Weak signal: give the network 3 seconds, then open the saved copy. The fetch keeps going and refreshes the copy.
      net.catch(() => null);
      return Promise.race([net, new Promise((res) => setTimeout(() => res(cached), 3000))]).catch(() => cached);
    })());
    return;
  }
  const hashed = /\/out\/[^/]*-[A-Za-z0-9]{6,}\.js$/.test(u.pathname) || /\/ocr\//.test(u.pathname);
  e.respondWith((async () => {
    const c = await caches.open(V); const hit = await c.match(q.url);
    if (hit && hashed) return hit;
    // Files without a hash in the name (main.js, main.css): network first so a new version shows on the very next launch; the saved copy is used only when offline or the network takes over 4 seconds.
    const net = fetch(q).then((r) => put(c, q.url, r)).catch(() => null);
    if (!hit) return (await net) || Response.error();
    const r = await Promise.race([net, new Promise((res) => setTimeout(() => res(null), 4000))]);
    return r || hit;
  })());
});
self.addEventListener('push', e => { let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) {}
  e.waitUntil(self.registration.showNotification(d.title || 'شفا', { body: d.body || 'حان موعد الدواء', tag: d.tag || 'shefa', icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [200, 100, 200], requireInteraction: true, data: { url: './' } })); });
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then(l => l.length ? l[0].focus() : self.clients.openWindow('./'))); });

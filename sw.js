const CACHE = 'drinks-v52';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap'
];
// Logos und Icons: werden beim Installieren vorgeladen, ein einzelner Fehlschlag
// blockiert die Installation aber nicht (allSettled statt addAll).
const ASSETS = [
  './icon-192.png', './icon-512.png',
  './logos/aperol.png', './logos/budweiser.png', './logos/egger.png', './logos/espresso_martini.png',
  './logos/gin_tonic.png', './logos/goesser.png', './logos/heineken.png', './logos/hirter.png',
  './logos/hugo.png', './logos/kaiser.png', './logos/kozel.png', './logos/mojito.png',
  './logos/murauer.png', './logos/ottakringer.png', './logos/pilsner.png', './logos/puntigamer.png',
  './logos/rotwein.png', './logos/schnaitl.png', './logos/schremser.png', './logos/starobrno.png',
  './logos/stiegl.png', './logos/trumer.png', './logos/villacher.png', './logos/weisser_spritzer.png',
  './logos/weisswein.png', './logos/wieselburger.png', './logos/zipfer.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(CORE).then(() => Promise.allSettled(ASSETS.map(u => c.add(u))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // App-Seite: erst Netz (damit Updates sofort ankommen), bei offline aus Cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Alles andere (Fonts, Icons): Cache zuerst, sonst Netz + nachträglich cachen
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(r => {
        if (r.ok && e.request.url.startsWith('http')) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return r;
      })
    )
  );
});

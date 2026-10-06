const CACHE = 'drinks-v56';
// Wie lange beim Start auf das Netz gewartet wird, bevor die gecachte Version kommt
const NAV_TIMEOUT = 2500;
const CORE = [
  './',
  './index.html',
  './manifest.json'
];
// Logos und Icons (Schrift kommt jetzt vom iPhone selbst, kein Google Fonts mehr): werden beim Installieren vorgeladen, ein einzelner Fehlschlag
// blockiert die Installation aber nicht (allSettled statt addAll).
const ASSETS = [
  './icon-192.png', './icon-512.png',
  './logos/aperol.png', './logos/budweiser.png', './logos/egger.png', './logos/espresso_martini.png',
  './logos/gin_tonic.png', './logos/goesser.png', './logos/heineken.png', './logos/hirter.png',
  './logos/hugo.png', './logos/kaiser.png', './logos/kozel.png', './logos/mojito.png',
  './logos/murauer.png', './logos/ottakringer.png', './logos/pilsner.png', './logos/puntigamer.png',
  './logos/rotwein.png', './logos/schnaitl.png', './logos/schremser.png', './logos/starobrno.png',
  './logos/stiegl.png', './logos/tegernseer.png', './logos/trumer.png', './logos/villacher.png',
  './logos/weisser_spritzer.png', './logos/weisswein.png', './logos/wieselburger.png', './logos/zipfer.png'
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
  // App Seite: erst Netz (damit Updates sofort ankommen). Antwortet das Netz nicht
  // innerhalb von NAV_TIMEOUT (schlechter Empfang in der Bar), kommt die gecachte
  // Version. Das Netz lädt im Hintergrund weiter und aktualisiert den Cache.
  if (e.request.mode === 'navigate') {
    const net = fetch(e.request).then(r => {
      if (r.ok) {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
      }
      return r;
    });
    e.waitUntil(net.then(() => {}, () => {}));
    e.respondWith(new Promise(resolve => {
      let settled = false;
      const finish = r => { if (!settled && r) { settled = true; resolve(r); } };
      // Nach Timeout aus dem Cache; gibt es (noch) keinen, weiter auf das Netz warten
      const timer = setTimeout(() => caches.match('./index.html').then(finish), NAV_TIMEOUT);
      net.then(
        r  => { clearTimeout(timer); r.ok ? finish(r) : caches.match('./index.html').then(c => finish(c || r)); },
        () => { clearTimeout(timer); caches.match('./index.html').then(c => finish(c || Response.error())); }
      );
    }));
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

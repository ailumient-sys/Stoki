/* =========================================================
   sw.js — Caché offline
   ========================================================= */

const CACHE = 'stoki-v107';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',

  './css/base.css',
  './css/components.css',
  './css/views.css',
  './css/modals.css',
  './css/misc.css',
  './css/views-orders.css',
  './css/views-clients.css',
  './css/exporter.css',
  './css/views-categories.css',
  './css/export-pdf-modal.css',
  './css/help.css',
  './css/apariencia.css',
  './css/shopping-lists.css',
  './css/venta-rapida.css',
  './css/global-search.css',

  './js/core/types.js',
  './js/core/storage.js',
  './js/core/format.js',
  './js/core/ui.js',
  './js/core/scanner.js',
  './js/core/exporter.js',
  './js/core/licencia.js',

  './js/calc.js',
  './js/lib/charts.js',

  './js/views/onboarding.js',
  './js/views/invest.js',
  './js/views/products.js',
  './js/views/product-form.js',
  './js/views/form-manager.js',
  './js/views/form-producto.js',
  './js/views/form-material.js',
  './js/views/form-servicio.js',
  './js/views/form-receta.js',
  './js/views/restock-page.js',
  './js/views/inventory.js',
  './js/views/inventory-pdf.js',
  './js/views/detail.js',
  './js/views/sell.js',
  './js/views/cart.js',
  './js/views/business.js',
  './js/views/ticket.js',
  './js/views/restock.js',
  './js/views/stats.js',
  './js/views/sales.js',
  './js/views/stats-page.js',
  './js/views/orders.js',
  './js/views/orders-export.js',
  './js/views/clients.js',
  './js/views/suppliers.js',
  './js/views/categories.js',
  './js/views/export-pdf-modal.js',
  './js/views/help.js',
  './js/views/apariencia.js',
  './js/views/calculadora.js',
  './js/views/shopping-lists.js',
  './js/views/backup-panel.js',
  './js/views/quick-add.js',
  './js/views/global-search.js',
  './js/views/more-menu.js',
  './js/views/tasa-aviso.js',
  './js/views/cierre-diario.js',
  './js/views/cierre-pdf.js',
  './js/views/movimientos.js',
  './js/views/licencia-ui.js',

  './js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if(!e.request.url.startsWith(self.location.origin)){
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).catch(() => caches.match('./index.html'))
    )
  );
});

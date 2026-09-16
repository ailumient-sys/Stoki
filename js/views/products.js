/* =========================================================
   views/products.js — Pestaña "Vender"
   Solo muestra productos CON STOCK.
   Long-press en card → agrega al carrito.
   Botón "+ Vender" → venta rápida.
   ========================================================= */

function renderProductos(){
  const cont = $('#v-prod');
  if(!cont) return;

  /* Filtrar: solo productos con stock > 0 */
  const conStock = window.DB.products.filter(p => calc(p).stock > 0);

  if(!window.DB.products.length){
    cont.innerHTML = `
      <div class="empty">
        <div class="ico">📦</div>
        <h3>Sin productos todavía</h3>
        <p>Agregá productos desde <b>Inventario</b><br>para poder venderlos.</p>
      </div>`;
    return;
  }

  if(!conStock.length){
    cont.innerHTML = `
      <div class="empty">
        <div class="ico">🚫</div>
        <h3>Sin stock disponible</h3>
        <p>Todos tus productos están agotados.<br>
        Reabastecé desde <b>Inventario</b> para vender.</p>
      </div>`;
    return;
  }

  const lista = [...conStock].sort((a, b) => (b.creado || 0) - (a.creado || 0));

  cont.innerHTML = lista.map(p => productCardHTML(p)).join('');
}

/* ---------- Card individual ---------- */
function productCardHTML(p){
  const c = calc(p);

  let badge;
  if(c.estadoStock === 'urgente'){
    badge = `<span class="badge out">Quedan ${c.stock}</span>`;
  } else if(c.estadoStock === 'atencion'){
    badge = `<span class="badge low">Quedan ${c.stock}</span>`;
  } else {
    badge = `<span class="badge ok">${c.stock} disp.</span>`;
  }

  const thumb = buildThumb(p, 58);

  const fotoBadge = (p.fotos && p.fotos.length > 1)
    ? `<span class="badge-fotos">📷 ${p.fotos.length}</span>`
    : '';

  return `
    <div class="card vender-card" data-id="${p.id}" data-vender="${p.id}">
      <div class="row">
        <div style="position:relative;flex:0 0 auto">
          ${thumb}
          ${fotoBadge}
        </div>
        <div class="info">
          <div class="name">${esc(p.nombre)}</div>
          <div class="meta">Venta: <b>${fmt(c.precioVenta)}</b></div>
          <div class="meta">Stock: ${c.stock} u</div>
        </div>
        ${badge}
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn-sell" style="flex:1" data-sell="${p.id}">
          🛒 Vender
        </button>
      </div>
      <div class="vender-hint">Mantené presionado para agregar al carrito</div>
    </div>`;
}

/* ---------- Miniatura ---------- */
function buildThumb(p, size){
  const baseStyle =
    `width:${size}px;height:${size}px;border-radius:12px;` +
    `flex:0 0 auto;overflow:hidden;display:flex;` +
    `align-items:center;justify-content:center;` +
    `font-size:${Math.round(size * 0.4)}px;font-weight:800;color:var(--dim);`;

  const foto = getFotoPrincipal(p);

  if(foto){
    return `<div style="${baseStyle}background-image:url('${foto}');
                 background-size:cover;background-position:center;"></div>`;
  }

  const inicial = esc((p.nombre || '?').charAt(0).toUpperCase());
  return `<div style="${baseStyle}background:var(--bg3);">${inicial}</div>`;
}
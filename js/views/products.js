/* =========================================================
   views/products.js — Pestaña Vender (rediseño)
   Grid denso + categorías + toque para agregar
   ========================================================= */

window.pvCols = window.pvCols || 4;
window.pvBusqueda = window.pvBusqueda || '';
window.pvCatsColapsadas = window.pvCatsColapsadas || {};

function renderProductos(){
  const cont = $('#v-prod');
  if(!cont) return;

  let todos, conStock;
  try {
    todos = Array.isArray(window.DB.products) ? window.DB.products : [];
    conStock = todos.filter(p => {
      try { return calc(p).stock > 0; }
      catch(e) { console.warn('[Vender] calc falló:', p && p.nombre, e); return false; }
    });
  } catch(e){
    cont.innerHTML = '<div class="empty"><div class="ico">⚠️</div><h3>Error al cargar productos</h3><p style="font-size:11px;word-break:break-all;padding:0 20px">' + esc(e && e.message ? e.message : String(e)) + '</p><p style="font-size:11px;margin-top:8px;color:var(--dim)">Productos en DB: ' + (window.DB.products || []).length + '</p></div>';
    return;
  }

  if(!todos.length){
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
        <p>Todos tus productos están agotados.<br>Reabastecé desde <b>Inventario</b>.</p>
      </div>`;
    return;
  }

  const toolbarHTML = buildToolbarVender();
  const buscando = window.pvBusqueda.trim().length > 0;

  let gridHTML = '';

  if(buscando){
    const filtrados = filtrarProductos(conStock, window.pvBusqueda);
    gridHTML = filtrados.length
      ? `<div class="pv-grid" style="--cols:${window.pvCols}">${filtrados.map(pvItemHTML).join('')}</div>`
      : `<div class="empty" style="padding:40px 20px">
           <div class="ico">🔍</div>
           <h3>Sin resultados</h3>
           <p>Nada coincide con "${esc(window.pvBusqueda)}"</p>
         </div>`;
  } else {
    gridHTML = buildGridPorCategorias(conStock);
  }

  cont.innerHTML = toolbarHTML + gridHTML;
  bindProductosEvents();
}

/* =========================================================
   TOOLBAR
   ========================================================= */
function buildToolbarVender(){
  return `
    <div class="pv-toolbar">
      <div class="pv-search">
        <input type="text" id="pv-search-input"
               placeholder="Buscar producto..."
               value="${esc(window.pvBusqueda)}"
               autocomplete="off">
        <button class="pv-search-clear" id="pv-search-clear"
                style="${window.pvBusqueda ? '' : 'display:none'}">✕</button>
      </div>
      <div class="pv-cols-btn" id="pv-cols-btn" title="Columnas">
        ⚙️
      </div>
    </div>`;
}

/* =========================================================
   GRID POR CATEGORÍAS
   ========================================================= */
function buildGridPorCategorias(productos){
  const cats = [...obtenerCategorias()];

  const grupos = cats.map(cat => ({
    id: cat.id,
    emoji: cat.emoji || '🏷️',
    nombre: cat.nombre,
    items: productos.filter(p => p.categoriaId === cat.id)
  }));

  const sinCat = productos.filter(p => !p.categoriaId || !buscarCategoria(p.categoriaId));

  /* Ordenar alfabéticamente */
  grupos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  if(sinCat.length){
    grupos.push({
      id: '_sin',
      emoji: '📦',
      nombre: 'Sin categoría',
      items: sinCat
    });
  }

  /* Si no hay categorías con productos, mostrar grid plano */
  const gruposConItems = grupos.filter(g => g.items.length);

  if(!gruposConItems.length){
    return `<div class="pv-grid" style="--cols:${window.pvCols}">${productos.map(pvItemHTML).join('')}</div>`;
  }

  return gruposConItems.map(g => {
    const colapsada = window.pvCatsColapsadas[g.id] === true;

    return `
      <div class="pv-cat ${colapsada ? 'colapsada' : ''}" data-cat="${g.id}">
        <div class="pv-cat-header" data-toggle-cat="${g.id}">
          <span class="pv-cat-chevron">${colapsada ? '▶' : '▼'}</span>
          <span class="pv-cat-nombre">${g.emoji} ${esc(g.nombre)}</span>
          <span class="pv-cat-count">${g.items.length}</span>
        </div>
        <div class="pv-cat-body">
          <div class="pv-grid" style="--cols:${window.pvCols}">
            ${g.items.map(pvItemHTML).join('')}
          </div>
        </div>
      </div>`;
  }).join('');
}

/* =========================================================
   ITEM DEL GRID
   ========================================================= */
function pvItemHTML(p){
  const c = calc(p);
  const foto = getFotoPrincipal(p);
  const inicial = esc((p.nombre || '?').charAt(0).toUpperCase());

  const thumbStyle = foto
    ? `background-image:url('${foto}')`
    : '';

  const enCarrito = (window.CARRITO.items || []).find(i => i.productoId === p.id);
  const cantCarrito = enCarrito ? enCarrito.cantidad : 0;

  const badge = cantCarrito > 0
    ? `<span class="pv-item-badge">${cantCarrito}</span>`
    : '';

  return `
    <div class="pv-item" data-add="${p.id}">
      ${badge}
      <div class="pv-item-thumb" style="${thumbStyle}">
        ${foto ? '' : inicial}
      </div>
      <div class="pv-item-info">
        <div class="pv-item-name">${esc(p.nombre)}</div>
        <div class="pv-item-price">${fmt(c.precioVenta)}</div>
      </div>
    </div>`;
}

/* =========================================================
   FILTRO
   ========================================================= */
function filtrarProductos(lista, q){
  const nq = normalize(q);
  return lista.filter(p =>
    normalize(p.nombre).includes(nq) ||
    normalize(p.codigoBarras || '').includes(nq)
  );
}

/* =========================================================
   EVENTOS
   ========================================================= */
function bindProductosEvents(){
  /* Buscar */
  const input = $('#pv-search-input');
  if(input){
    input.addEventListener('input', e => {
      window.pvBusqueda = e.target.value;
      renderProductos();
      const nuevo = $('#pv-search-input');
      if(nuevo){
        nuevo.focus();
        nuevo.setSelectionRange(window.pvBusqueda.length, window.pvBusqueda.length);
      }
    });
  }

  const clear = $('#pv-search-clear');
  if(clear){
    clear.addEventListener('click', e => {
      e.stopPropagation();
      window.pvBusqueda = '';
      renderProductos();
    });
  }

  /* Botón columnas */
  const btnCols = $('#pv-cols-btn');
  if(btnCols) btnCols.addEventListener('click', abrirMenuColumnas);

  /* Toggle categorías */
  document.querySelectorAll('[data-toggle-cat]').forEach(h => {
    h.addEventListener('click', () => {
      const id = h.dataset.toggleCat;
      window.pvCatsColapsadas[id] = !window.pvCatsColapsadas[id];
      renderProductos();
    });
  });

  /* Toque en producto */
  document.querySelectorAll('[data-add]').forEach(el => {
    el.addEventListener('click', () => {
      agregarAlCarrito(el.dataset.add);
      /* Animación de toque */
      el.classList.add('pv-pulse');
      setTimeout(() => el.classList.remove('pv-pulse'), 300);
    });
  });
}

/* =========================================================
   MENÚ DE COLUMNAS
   ========================================================= */
function abrirMenuColumnas(){
  if(document.querySelector('#m-pv-cols')) return;

  const html = `
    <div class="overlay centered open" id="m-pv-cols">
      <div class="sheet" style="max-width:340px;padding:18px">
        <h2 style="text-align:center;margin-bottom:16px">Columnas</h2>

        <div class="pv-cols-grid">
          <button class="pv-cols-opt ${window.pvCols === 3 ? 'active' : ''}" data-cols="3">3</button>
          <button class="pv-cols-opt ${window.pvCols === 4 ? 'active' : ''}" data-cols="4">4</button>
          <button class="pv-cols-opt ${window.pvCols === 5 ? 'active' : ''}" data-cols="5">5</button>
          <button class="pv-cols-opt ${window.pvCols === 6 ? 'active' : ''}" data-cols="6">6</button>
        </div>

        <button class="btn-ghost" id="pv-cols-cerrar" style="margin-top:16px">Cerrar</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const cerrar = () => {
    const el = document.querySelector('#m-pv-cols');
    if(el) el.remove();
  };

  document.querySelector('#pv-cols-cerrar').addEventListener('click', cerrar);
  document.querySelector('#m-pv-cols').addEventListener('click', e => {
    if(e.target.id === 'm-pv-cols') cerrar();
  });

  document.querySelectorAll('.pv-cols-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      window.pvCols = +btn.dataset.cols;
      localStorage.setItem('stoki_pv_cols', window.pvCols);
      cerrar();
      renderProductos();
    });
  });
}

/* Cargar columnas guardadas */
(function(){
  try{
    const saved = localStorage.getItem('stoki_pv_cols');
    if(saved) window.pvCols = +saved;
  }catch(e){}
})();

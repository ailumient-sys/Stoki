/* =========================================================
   views/inventory.js — Tab 3: cuadrícula con favoritos,
   búsqueda, escaneo, ordenamiento y alertas de stock.
   + Botón Exportar PDF
   + Botón Exportar Catálogo
   v11: badge de fotos lee de IndexedDB vía getFotosProducto()
   ========================================================= */

let invModoOrden = 'recientes';
let invFiltroTipo = 'todo';
let invBusqueda  = '';
let invCatsExpandidas = {};  /* { catId: true/false } */

const INV_ORDENES = [
  { key: 'recientes',   label: '🕐 Más recientes' },
  { key: 'az',          label: '🔤 Alfabético (A-Z)' },
  { key: 'za',          label: '🔤 Alfabético (Z-A)' },
  { key: 'precio-asc',  label: '💵 Menor precio' },
  { key: 'precio-desc', label: '💵 Mayor precio' },
  { key: 'stock-asc',   label: '📉 Menor stock' },
  { key: 'stock-desc',  label: '📈 Mayor stock' },
  { key: 'alerta',      label: '⚠️ Alertas primero' },
  { key: 'favoritos',   label: '❤️ Solo favoritos' }
];

(function(){
  try{
    const guardado = localStorage.getItem('stoki_inv_orden');
    if(guardado && INV_ORDENES.find(o => o.key === guardado)){
      invModoOrden = guardado;
    }
  }catch(e){}
})();

function renderInventario(){
  const cont = $('#v-inv');
  if(!cont) return;

  const toolbar = buildInventarioToolbar();

  if(!window.DB.products.length){
    cont.innerHTML = toolbar + `
      <div class="empty">
        <div class="ico">📊</div>
        <h3>Sin datos aún</h3>
        <p>Agrega productos para ver aquí<br>tu balance y ganancias.</p>
      </div>`;
    bindInventarioEvents();
    return;
  }

  const lista = getInventarioList();

  if(!lista.length){
    cont.innerHTML = toolbar + `
      <div class="empty">
        <div class="ico">🔍</div>
        <h3>Sin resultados</h3>
        <p>Ningún producto coincide con "${esc(invBusqueda)}"</p>
      </div>`;
    bindInventarioEvents();
    return;
  }

  /* Si hay búsqueda o filtro especial, mostrar grilla plana.
     Si no, agrupar por categoría. */
  const usarAgrupacion = !invBusqueda && invModoOrden === 'recientes';

  if(usarAgrupacion){
    cont.innerHTML = toolbar + renderInventarioAgrupado(lista);
  } else {
    cont.innerHTML = toolbar + `
      <div class="inv-grid">
        ${lista.map(inventoryItemHTML).join('')}
      </div>`;
  }

  bindInventarioEvents();
}

/* =========================================================
   AGRUPACIÓN POR CATEGORÍA
   ========================================================= */
function renderInventarioAgrupado(lista){
  const cats = [...obtenerCategorias()];
  const sinCat = [];

  const grupos = cats.map(cat => ({
    id: cat.id,
    nombre: cat.nombre,
    items: []
  }));

  const mapa = {};
  grupos.forEach(g => mapa[g.id] = g);

  lista.forEach(p => {
    if(p.categoriaId && mapa[p.categoriaId]){
      mapa[p.categoriaId].items.push(p);
    } else {
      sinCat.push(p);
    }
  });

  /* Ordenar grupos alfabéticamente */
  grupos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  let html = '';

  grupos.forEach(g => {
    if(!g.items.length) return;

    const abierto = invCatsExpandidas[g.id] !== false;  /* default abierto */
    html += `
      <div class="cat-section ${abierto ? 'open' : ''}" data-cat="${g.id}">
        <div class="cat-section-header">
          <span class="cat-chevron">▶</span>
          <span>${emojiCategoria(g.id)} ${esc(g.nombre)}</span>
          <button class="cat-add-btn" data-cat-add="${g.id}" type="button" title="Agregar varios aquí">⚡</button>
          <span class="cat-section-count">${g.items.length}</span>
        </div>
        <div class="cat-section-body">
          <div class="inv-grid">
            ${g.items.map(inventoryItemHTML).join('')}
          </div>
        </div>
      </div>`;
  });

  if(sinCat.length){
    const abierto = invCatsExpandidas['_sin'] !== false;
    html += `
      <div class="cat-section ${abierto ? 'open' : ''}" data-cat="_sin">
        <div class="cat-section-header" style="border-left-color:var(--dim)">
          <span class="cat-chevron">▶</span>
          <span>📦 Sin categoría</span>
          <span class="cat-section-count">${sinCat.length}</span>
        </div>
        <div class="cat-section-body">
          <div class="inv-grid">
            ${sinCat.map(inventoryItemHTML).join('')}
          </div>
        </div>
      </div>`;
  }

  return html;
}

/* =========================================================
   BARRA: búsqueda + escaneo + chips + botones PDF/Catálogo
   ========================================================= */
function buildInventarioToolbar(){
  const mostrados = getInventarioList().length;

  const contador = invBusqueda
    ? `<div class="inv-counter">${mostrados} resultado${mostrados !== 1 ? 's' : ''}</div>`
    : '';

  const ordenActual = INV_ORDENES.find(o => o.key === invModoOrden) || INV_ORDENES[0];

  return `
    <div class="inv-toolbar">
      <div style="display:flex;justify-content:space-between;
                  align-items:center;margin-bottom:10px">
        <div style="font-size:11px;font-weight:900;color:var(--dim);
                    text-transform:uppercase;letter-spacing:.6px">
          📊 Inventario
        </div>
        <div style="display:flex;gap:6px">
          <button type="button" id="inv-quickadd"
                  style="background:rgba(59,130,246,.12);
                         border:1px solid rgba(59,130,246,.35);
                         border-radius:8px;padding:7px 10px;color:#60a5fa;
                         font-size:11px;font-weight:800;font-family:inherit;
                         cursor:pointer"
                  title="Agregar varios">
            ⚡
          </button>
          <button type="button" id="inv-export"
                  style="background:rgba(34,197,94,.12);
                         border:1px solid rgba(34,197,94,.35);
                         border-radius:8px;padding:7px 12px;color:var(--green);
                         font-size:11px;font-weight:800;font-family:inherit;
                         cursor:pointer">
            📄 Exportar
          </button>
        </div>
      </div>

      <div class="inv-tabs" id="inv-tabs">
        <button class="inv-tab ${invFiltroTipo==='todo'?'active':''}" data-tipo="todo" type="button">Todo</button>
        <button class="inv-tab ${invFiltroTipo==='producto'?'active':''}" data-tipo="producto" type="button">🟢 Producto</button>
        <button class="inv-tab ${invFiltroTipo==='material'?'active':''}" data-tipo="material" type="button">🔵 Material</button>
        <button class="inv-tab ${invFiltroTipo==='receta'?'active':''}" data-tipo="receta" type="button">🟣 Receta</button>
        <button class="inv-tab ${invFiltroTipo==='servicio'?'active':''}" data-tipo="servicio" type="button">🔴 Servicio</button>
      </div>

      <div class="inv-search">
        <input type="text"
               id="inv-search-input"
               placeholder="Buscar en inventario..."
               autocomplete="off"
               value="${esc(invBusqueda)}"
               style="padding-right:80px">
        <button class="inv-search-scan" id="inv-search-scan" type="button" aria-label="Escanear">📷</button>
        ${invBusqueda ? `<button class="inv-search-clear" id="inv-search-clear">✕</button>` : ''}
      </div>

      <button class="inv-filter-btn" id="inv-filter-btn" type="button"
              onclick="event.preventDefault(); event.stopPropagation(); abrirFiltroInventario();">
        <span class="inv-filter-icon">🔽</span>
        <span class="inv-filter-label">${ordenActual.label}</span>
        <span class="inv-filter-chevron">▾</span>
      </button>

      ${contador}
    </div>`;
}

/* Abrir el sheet de filtros */
function abrirFiltroInventario(){
  if(document.querySelector('#m-inv-filtro')) return;

  const opcionesHTML = INV_ORDENES.map(o => `
    <button class="inv-filter-opt ${invModoOrden === o.key ? 'active' : ''}"
            data-orden="${o.key}" type="button">
      <span>${o.label}</span>
      <span class="inv-filter-check">${invModoOrden === o.key ? '✓' : ''}</span>
    </button>
  `).join('');

  const html = `
    <div class="overlay centered open" id="m-inv-filtro">
      <div class="sheet" style="position:relative">
        <div class="sheet-handle"></div>
        <button class="x" id="invf-close">✕</button>
        <h2>Ordenar productos</h2>
        <div class="sub">Elegí cómo querés ver tu inventario.</div>

        <div class="inv-filter-list">
          ${opcionesHTML}
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const cerrar = () => {
    const el = document.querySelector('#m-inv-filtro');
    if(el) el.remove();
  };

  document.querySelector('#invf-close').addEventListener('click', cerrar);
  document.querySelector('#m-inv-filtro').addEventListener('click', e => {
    if(e.target.id === 'm-inv-filtro') cerrar();
  });

  document.querySelectorAll('.inv-filter-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      invModoOrden = btn.dataset.orden;
      try{ localStorage.setItem('stoki_inv_orden', invModoOrden); }catch(e){}
      cerrar();
      renderInventario();
      if(navigator.vibrate) navigator.vibrate(10);
    });
  });
}

/* =========================================================
   FILTRAR + ORDENAR
   ========================================================= */
function getInventarioList(){
  let lista = [...window.DB.products];

  /* Filtrar por tipo */
  if(invFiltroTipo !== 'todo'){
    lista = lista.filter(p => tipoDe(p) === invFiltroTipo);
  }

  if(invBusqueda){
    const q = normalize(invBusqueda);
    lista = lista.filter(p => normalize(p.nombre).includes(q));
  }

  if(invModoOrden === 'favoritos'){
    lista = lista.filter(p => p.favorito);
  }

  lista.sort((a, b) => {
    if(invModoOrden !== 'favoritos'){
      if(a.favorito && !b.favorito) return -1;
      if(!a.favorito && b.favorito) return 1;
    }

    const ca = calc(a);
    const cb = calc(b);

    switch(invModoOrden){
      case 'az':
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity:'base' });
      case 'za':
        return b.nombre.localeCompare(a.nombre, 'es', { sensitivity:'base' });
      case 'precio-asc':
        return ca.precioVenta - cb.precioVenta;
      case 'precio-desc':
        return cb.precioVenta - ca.precioVenta;
      case 'stock-asc':
        return ca.stock - cb.stock;
      case 'stock-desc':
        return cb.stock - ca.stock;
      case 'alerta':
        return getPrioridadAlerta(ca) - getPrioridadAlerta(cb);
      case 'recientes':
      case 'favoritos':
      default:
        return (b.creado || 0) - (a.creado || 0);
    }
  });

  return lista;
}

function getPrioridadAlerta(c){
  switch(c.estadoStock){
    case 'agotado':  return 0;
    case 'urgente':  return 1;
    case 'atencion': return 2;
    case 'ok':       return 3;
    default:         return 4;
  }
}

function normalize(str){
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/* =========================================================
   ITEM
   ========================================================= */
function inventoryItemHTML(p){
  const c = calc(p);

  const colorStock = {
    ok:       'var(--green)',
    atencion: 'var(--amber)',
    urgente:  'var(--red)',
    agotado:  'var(--dim)'
  }[c.estadoStock];

  const enRojoFin = c.saldo < 0;
  const colorFin  = enRojoFin ? 'var(--red)' : 'var(--green)';
  const iconoFin  = enRojoFin ? '🔻' : '💰';
  const textoFin  = enRojoFin ? 'Recuperar' : 'Ganando';

  const thumb = buildInvThumb(p);
  const corazon = p.favorito ? '❤️' : '🤍';

  /* Leer cantidad de fotos desde IndexedDB (vía caché) */
  const cantFotos = getFotosProducto(p).length;
  const badgeFotos = (cantFotos > 1)
    ? `<span class="badge-fotos">📷 ${cantFotos}</span>`
    : '';

  /* Badge stock: número con color del estado */
  const stockBadge = `
    <div class="inv-stock-badge" style="background:${colorStock}">
      ${c.stock}
    </div>`;

  return `
    <div class="inv-item" data-detail="${p.id}">
      <div class="inv-corazon"
           data-favorito="${p.id}"
           data-activo="${p.favorito ? '1' : '0'}">${corazon}</div>

      ${stockBadge}

      <div style="position:relative">
        ${thumb}
        ${badgeFotos}
      </div>

      <div class="inv-name">${esc(p.nombre)}</div>

      <div class="inv-fin-badge" style="color:${colorFin}">
        ${iconoFin} ${textoFin}
      </div>
    </div>`;
}

function buildInvThumb(p){
  const base =
    `width:100%;aspect-ratio:1;border-radius:10px;` +
    `background:var(--bg3);display:flex;align-items:center;` +
    `justify-content:center;font-size:34px;font-weight:800;` +
    `color:var(--dim);overflow:hidden;margin-bottom:7px;`;

  const foto = getFotoPrincipal(p);

  if(foto){
    return `<div style="${base}background-image:url('${foto}');
                 background-size:cover;background-position:center;"></div>`;
  }

  const inicial = esc((p.nombre || '?').charAt(0).toUpperCase());
  return `<div style="${base}">${inicial}</div>`;
}

/* =========================================================
   EVENTOS
   ========================================================= */
function bindInventarioEvents(){
  const input = $('#inv-search-input');
  if(input){
    input.addEventListener('input', e => {
      invBusqueda = e.target.value;
      renderInventario();
      const nuevo = $('#inv-search-input');
      if(nuevo){
        nuevo.focus();
        nuevo.setSelectionRange(invBusqueda.length, invBusqueda.length);
      }
    });
  }

  const scanBtn = $('#inv-search-scan');
  if(scanBtn){
    scanBtn.addEventListener('click', e => {
      e.stopPropagation();
      escanearBusqueda();
    });
  }

  const clear = $('#inv-search-clear');
  if(clear){
    clear.addEventListener('click', e => {
      e.stopPropagation();
      invBusqueda = '';
      renderInventario();
    });
  }

  /* El bind del filtro ahora se hace por event delegation global (más abajo) */

  document.querySelectorAll('.inv-corazon').forEach(cor => {
    cor.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorito(cor.dataset.favorito);
    });

    cor.addEventListener('touchstart', e => {
      e.stopPropagation();
    }, { passive: true });
  });

  /* Botón ⚡ de cada categoría */
  document.querySelectorAll('[data-cat-add]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const catId = btn.dataset.catAdd;
      if(typeof abrirCargaRapida === 'function'){
        abrirCargaRapida(catId);
      }
    });
  });

  /* Secciones desplegables de categorías */
  document.querySelectorAll('.cat-section-header').forEach(header => {
    header.addEventListener('click', e => {
      if(e.target.closest('[data-cat-add]')) return;
      const sec = header.closest('.cat-section');
      if(!sec) return;
      const id = sec.dataset.cat;
      const abierto = sec.classList.toggle('open');
      invCatsExpandidas[id] = abierto;
    });
  });

  /* Botón Quick Add (agregar múltiples) */
  const btnQA = $('#inv-quickadd');
  if(btnQA){
    btnQA.addEventListener('click', e => {
      e.stopPropagation();
      if(typeof abrirCargaRapida === 'function'){
        abrirCargaRapida(null);
      } else {
        toast('⚠️ Función no disponible');
      }
    });
  }

  /* Botón Exportar unificado */
  const btnExport = $('#inv-export');
  if(btnExport){
    btnExport.addEventListener('click', e => {
      e.stopPropagation();
      if(typeof abrirModalExportPDF === 'function'){
        abrirModalExportPDF();
      } else {
        toast('⚠️ Exportador no disponible');
      }
    });
  }
}

/* =========================================================
   ESCANEAR EN BÚSQUEDA
   ========================================================= */
function escanearBusqueda(){
  openScanner((code) => {
    const p = window.DB.products.find(x => x.codigoBarras === code);

    if(p){
      toast(`✅ ${p.nombre}`);
      setTimeout(() => openDetail(p.id), 300);
    } else {
      invBusqueda = code;
      renderInventario();
      toast('🔍 Sin resultados para este código');
    }
  });
}

/* =========================================================
   FAVORITOS
   ========================================================= */
function toggleFavorito(id){
  const p = window.DB.products.find(x => x.id === id);
  if(!p) return;

  p.favorito = !p.favorito;
  saveDB();

  if(navigator.vibrate) navigator.vibrate(15);

  renderInventario();
  toast(p.favorito ? '❤️ Marcado como favorito' : '🤍 Favorito quitado');
    }


/* =========================================================
   FILTRO DE INVENTARIO — Event delegation global
   Funciona sin importar cuándo se cree el botón
   ========================================================= */
/* Exponer la función globalmente para que funcione el onclick inline */
window.abrirFiltroInventario = abrirFiltroInventario;

document.addEventListener('click', e => {
  const btn = e.target.closest('#inv-filter-btn');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();

  if(typeof abrirFiltroInventario === 'function'){
    abrirFiltroInventario();
  } else {
    console.warn('[Filtro] abrirFiltroInventario no definida');
  }
}, true);
/* ==== INV_TABS_DELEGATION v2 ==== */
document.addEventListener('click', function(e){
  var tab = e.target.closest('.inv-tab');
  if(!tab) return;
  var tipo = tab.dataset.tipo;
  if(!tipo) return;
  if(typeof invFiltroTipo !== 'undefined'){
    invFiltroTipo = tipo;
    if(typeof renderInventario === 'function') renderInventario();
    if(navigator.vibrate) navigator.vibrate(10);
  }
}, true);

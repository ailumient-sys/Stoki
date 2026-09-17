/* =========================================================
   views/cart.js — PARTE 1/2
   FAB menu, picker de productos, carrito
   ========================================================= */

let pickerModo = 'single';   /* 'single' | 'multiple' */
let pickerBusqueda = '';

/* =========================================================
   FAB MENU (2 opciones)
   ========================================================= */
function openFabMenu(){
  if(document.querySelector('#m-fab-menu')) return;

  const html = `
    <div class="overlay fab-menu-overlay open" id="m-fab-menu">
      <div class="fab-menu">
        <button class="fab-menu-option" id="fab-opt-single" type="button">
          <span class="fab-menu-icon">🛒</span>
          <span class="fab-menu-text">
            <span class="fab-menu-title">Venta única</span>
            <span class="fab-menu-sub">Vender 1 producto</span>
          </span>
        </button>

        <button class="fab-menu-option" id="fab-opt-multiple" type="button">
          <span class="fab-menu-icon">🛒🛒</span>
          <span class="fab-menu-text">
            <span class="fab-menu-title">Venta múltiple</span>
            <span class="fab-menu-sub">Armar un carrito</span>
          </span>
        </button>

        <button class="fab-menu-cancel" id="fab-menu-cerrar" type="button">Cerrar</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#fab-opt-single').addEventListener('click', onFabSingle);
  document.querySelector('#fab-opt-multiple').addEventListener('click', onFabMultiple);
  document.querySelector('#fab-menu-cerrar').addEventListener('click', closeFabMenu);

  document.querySelector('#m-fab-menu').addEventListener('click', e => {
    if(e.target.id === 'm-fab-menu') closeFabMenu();
  });
}

function closeFabMenu(){
  const el = document.querySelector('#m-fab-menu');
  if(el) el.remove();
}

function onFabSingle(){
  closeFabMenu();
  setTimeout(() => openPicker('single'), 150);
}

function onFabMultiple(){
  closeFabMenu();
  setTimeout(() => openPicker('multiple'), 150);
}

/* =========================================================
   PICKER (buscar producto)
   ========================================================= */
function openPicker(modo){
  pickerModo = modo;
  pickerBusqueda = '';

  if(document.querySelector('#m-picker')) return;

  const titulo = modo === 'single' ? '🛒 Venta única' : '🛒🛒 Agregar al carrito';
  const subt = modo === 'single'
    ? 'Elegí el producto a vender'
    : 'Elegí los productos a agregar';

  const html = `
    <div class="overlay centered open" id="m-picker">
      <div class="sheet" style="position:relative">
        <button class="x" id="picker-close">✕</button>
        <h2>${titulo}</h2>
        <div class="sub">${subt}</div>

        <div class="inv-search" style="margin-top:10px">
          <input type="text"
                 id="picker-input"
                 placeholder="Buscar producto..."
                 autocomplete="off"
                 style="padding-right:80px">
          <button class="inv-search-scan" id="picker-scan" type="button" aria-label="Escanear">📷</button>
        </div>

        <div id="picker-list" class="picker-list"></div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  renderPickerList();

  document.querySelector('#picker-close').addEventListener('click', closePicker);

  document.querySelector('#picker-input').addEventListener('input', e => {
    pickerBusqueda = e.target.value;
    renderPickerList();
  });

  document.querySelector('#picker-scan').addEventListener('click', () => {
    openScanner(code => {
      const p = window.DB.products.find(x => x.codigoBarras === code);
      if(p){
        onPickerSelect(p.id);
      } else {
        toast('🔍 No hay producto con ese código');
      }
    });
  });

  document.querySelector('#m-picker').addEventListener('click', e => {
    if(e.target.id === 'm-picker') closePicker();
  });

  setTimeout(() => {
    const inp = document.querySelector('#picker-input');
    if(inp) inp.focus();
  }, 300);
}

function closePicker(){
  const el = document.querySelector('#m-picker');
  if(el) el.remove();
  pickerBusqueda = '';
}

function renderPickerList(){
  const cont = document.querySelector('#picker-list');
  if(!cont) return;

  const q = normalize(pickerBusqueda);
  let lista = [...window.DB.products];

  /* Filtrar por búsqueda */
  if(q){
    lista = lista.filter(p => normalize(p.nombre).includes(q));
  }

  /* Solo los que tienen stock */
  lista = lista.filter(p => calc(p).stock > 0);

  if(!lista.length){
    cont.innerHTML = `
      <div class="empty" style="padding:30px 10px">
        <div class="ico">📦</div>
        <h3>Sin productos</h3>
        <p>${pickerBusqueda ? 'Ninguno coincide' : 'No hay productos con stock'}</p>
      </div>`;
    return;
  }

  /* Orden: favoritos primero, después alfabético */
  lista.sort((a, b) => {
    if(a.favorito && !b.favorito) return -1;
    if(!a.favorito && b.favorito) return 1;
    return a.nombre.localeCompare(b.nombre, 'es', { sensitivity:'base' });
  });

  cont.innerHTML = lista.map(p => {
    const c = calc(p);
    const thumb = buildThumb(p, 44);
    const corazon = p.favorito ? '❤️ ' : '';

    return `
      <div class="picker-item" data-id="${p.id}">
        ${thumb}
        <div class="picker-info">
          <div class="picker-name">${corazon}${esc(p.nombre)}</div>
          <div class="picker-meta">${fmt(c.precioVenta)} · ${c.stock} disp.</div>
        </div>
      </div>`;
  }).join('');

  cont.querySelectorAll('.picker-item').forEach(el => {
    el.addEventListener('click', () => onPickerSelect(el.dataset.id));
  });
}

function onPickerSelect(productoId){
  const p = window.DB.products.find(x => x.id === productoId);
  if(!p) return;

  if(pickerModo === 'single'){
    closePicker();
    setTimeout(() => openSell(productoId), 200);
  } else {
    agregarAlCarrito(productoId);
  }
}

/* =========================================================
   CARRITO — agregar, actualizar FAB
   ========================================================= */
function agregarAlCarrito(productoId, cantidad = 1){
  const p = window.DB.products.find(x => x.id === productoId);
  if(!p) return;

  const c = calc(p);
  if(c.stock <= 0){
    toast('⚠️ Sin stock');
    return;
  }

  const existente = window.CARRITO.items.find(i => i.productoId === productoId);

  if(existente){
    if(existente.cantidad + cantidad > c.stock){
      toast(`⚠️ Solo hay ${c.stock} unidades`);
      return;
    }
    existente.cantidad += cantidad;
  } else {
    window.CARRITO.items.push({
      productoId,
      cantidad,
      precioUnitario: c.precioVenta
    });
  }

  saveCarrito();
  updateCartFab();

  if(navigator.vibrate) navigator.vibrate(15);

  const total = window.CARRITO.items.reduce(
    (s, i) => s + i.cantidad, 0
  );
  toast(`✅ ${p.nombre} · Carrito: ${total}`);
}

function updateCartFab(){
  const fab = document.querySelector('#cart-fab');
  if(!fab) return;

  const items = window.CARRITO.items || [];

  if(!items.length){
    fab.classList.add('hidden');
    fab.classList.remove('con-items');
    return;
  }

  fab.classList.remove('hidden');
  fab.classList.add('con-items');

  let totalUSD = 0;
  let count = 0;

  items.forEach(i => {
    totalUSD += i.cantidad * i.precioUnitario;
    count += i.cantidad;
  });

  const countEl = document.querySelector('#cart-fab-count');
  const montoEl = document.querySelector('#cart-fab-monto');

  if(countEl) countEl.textContent = count;
  if(montoEl) montoEl.textContent = fmt(totalUSD);

  if(navigator.vibrate) navigator.vibrate(8);
}

/* Abrir el modal del ticket (el carrito) */
function abrirTicketCarrito(){
  openCartModal();
}
/* =========================================================
   views/cart.js — PARTE 2/2
   Modal carrito + finalizar venta + init
   ========================================================= */

/* =========================================================
   MODAL CARRITO
   ========================================================= */
function openCartModal(){
  const items = window.CARRITO.items || [];
  if(!items.length){
    toast('⚠️ El carrito está vacío');
    return;
  }

  if(document.querySelector('#m-cart')) return;

  const html = `
    <div class="overlay open" id="m-cart">
      <div class="sheet" style="position:relative">
        <div class="sheet-handle"></div>
        <button class="x" id="cart-close">✕</button>
        <h2>🛒 Carrito</h2>
        <div class="sub">Revisá los productos antes de finalizar.</div>

        <div id="cart-list"></div>
        <div class="cart-totales" id="cart-totales"></div>

        <button class="btn-main" id="cart-finish">✅ Finalizar venta</button>
        <button class="btn-ghost btn-danger" id="cart-clear">🗑️ Vaciar carrito</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  renderCartList();

  document.querySelector('#cart-close').addEventListener('click', closeCartModal);
  document.querySelector('#cart-finish').addEventListener('click', finishCart);
  document.querySelector('#cart-clear').addEventListener('click', vaciarCarrito);

  document.querySelector('#m-cart').addEventListener('click', e => {
    if(e.target.id === 'm-cart') closeCartModal();
  });
}

function closeCartModal(){
  const el = document.querySelector('#m-cart');
  if(el) el.remove();
}

function renderCartList(){
  const cont = document.querySelector('#cart-list');
  const totales = document.querySelector('#cart-totales');
  if(!cont) return;

  const items = window.CARRITO.items || [];

  if(!items.length){
    cont.innerHTML = '<div class="empty" style="padding:20px"><p>Carrito vacío</p></div>';
    if(totales) totales.innerHTML = '';
    return;
  }

  let totalUSD = 0;
  let html = '';

  items.forEach((item, idx) => {
    const p = window.DB.products.find(x => x.id === item.productoId);
    if(!p) return;

    const subtotal = item.cantidad * item.precioUnitario;
    totalUSD += subtotal;

    const thumb = buildThumb(p, 44);

    html += `
      <div class="cart-item">
        ${thumb}
        <div class="cart-item-info">
          <div class="cart-item-name">${esc(p.nombre)}</div>
          <div class="cart-item-prices">
            <span>${item.cantidad} × ${fmt(item.precioUnitario)}</span>
            <span class="cart-item-subtotal">${fmt(subtotal)}</span>
          </div>
        </div>
        <div class="cart-item-actions">
          <button class="cart-item-btn" data-mod="${idx}" data-delta="-1" type="button">−</button>
          <span class="cart-item-cant">${item.cantidad}</span>
          <button class="cart-item-btn" data-mod="${idx}" data-delta="1" type="button">+</button>
          <button class="cart-item-del" data-del="${idx}" type="button">🗑️</button>
        </div>
      </div>`;
  });

  cont.innerHTML = html;

  if(totales){
    const ref = fmtRefOnly(totalUSD);
    totales.innerHTML = `
      <div class="cart-total-line">
        <span>Total</span>
        <b>${fmt(totalUSD)}</b>
      </div>
      ${ref ? `<div class="cart-total-ref">${ref}</div>` : ''}
    `;
  }

  /* Bind eventos */
  cont.querySelectorAll('[data-mod]').forEach(btn => {
    btn.addEventListener('click', () => {
      cartModificar(+btn.dataset.mod, +btn.dataset.delta);
    });
  });

  cont.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => cartEliminar(+btn.dataset.del));
  });
}

function cartModificar(idx, delta){
  const item = window.CARRITO.items[idx];
  if(!item) return;

  const p = window.DB.products.find(x => x.id === item.productoId);
  if(!p) return;

  const c = calc(p);
  const nuevaCant = item.cantidad + delta;

  if(nuevaCant <= 0){
    cartEliminar(idx);
    return;
  }

  if(nuevaCant > c.stock){
    toast(`⚠️ Solo hay ${c.stock} unidades`);
    return;
  }

  item.cantidad = nuevaCant;
  saveCarrito();
  renderCartList();
  updateCartFab();
}

function cartEliminar(idx){
  window.CARRITO.items.splice(idx, 1);
  saveCarrito();
  updateCartFab();

  if(!window.CARRITO.items.length){
    closeCartModal();
    toast('🗑️ Carrito vacío');
  } else {
    renderCartList();
  }
}

async function vaciarCarrito(){
  const ok = await confirmarAccion({
    titulo: '¿Vaciar el carrito?',
    mensaje: 'Se quitarán todos los productos de la lista.',
    botonOk: 'Vaciar',
    botonCancel: 'Cancelar',
    colorOk: 'rojo'
  });

  if(!ok) return;

  clearCarrito();
  updateCartFab();
  closeCartModal();
  toast('🗑️ Carrito vaciado');
}

/* =========================================================
   FINALIZAR VENTA (desde el carrito)
   ========================================================= */
function finishCart(){
  const items = window.CARRITO.items || [];
  if(!items.length) return;

  /* Validar stock */
  for(const item of items){
    const p = window.DB.products.find(x => x.id === item.productoId);
    if(!p) continue;
    const c = calc(p);
    if(item.cantidad > c.stock){
      toast(`⚠️ "${p.nombre}" solo tiene ${c.stock} u.`);
      return;
    }
  }

  /* Calcular totales y preparar items */
  let totalUSD = 0;
  let gananciaTotal = 0;

  const itemsDetallados = items.map(item => {
    const p = window.DB.products.find(x => x.id === item.productoId);
    const c = calc(p);
    const costoVenta = calcularCostoFIFO(c.lotes, item.cantidad);
    const subtotal = item.cantidad * item.precioUnitario;
    const gananciaItem = subtotal - costoVenta;

    totalUSD += subtotal;
    gananciaTotal += gananciaItem;

    return {
      productoId: item.productoId,
      nombre: p.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      costoUnitario: item.cantidad > 0 ? costoVenta / item.cantidad : 0,
      loteId: getLoteAsignado(c.lotes, item.cantidad),
      costoVenta,
      gananciaItem
    };
  });

  /* Preparar pendingSale con todos los items */
  window.pendingSale = {
    items: itemsDetallados,
    total: totalUSD,
    ganancia: gananciaTotal,
    fechaBase: todayISO(),
    tipo: 'cart'
  };

  closeCartModal();
  setTimeout(() => {
    if(typeof openConfirmSale === 'function') openConfirmSale();
  }, 150);
}

/* =========================================================
   INIT
   ========================================================= */
function initCart(){
  /* El FAB "cart-fab" abre el carrito */
  const fab = document.querySelector('#cart-fab');
  if(fab){
    fab.addEventListener('click', openCartModal);
  }

  /* Actualizar el FAB al arrancar */
  updateCartFab();
}


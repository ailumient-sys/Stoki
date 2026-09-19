/* =========================================================
   views/orders.js — PARTE 1/3
   Lista de pedidos + crear nuevo + selector de cliente
   v11: comprobantes en IndexedDB
   ========================================================= */

let pedClienteId = null;
let _ordersVistaActual = 'pedidos';
let pedCarrito = [];
let pedPickerModo = 'single';

function renderOrders(){
  const cont = document.querySelector('#v-orders');
  if(!cont) return;

  const orders = window.DB.orders || [];

  /* Tabs: Pedidos / Citas */
  const tabs = `
    <div class="orders-tabs">
      <button class="orders-tab ${_ordersVistaActual==='pedidos'?'active':''}" data-ovista="pedidos" type="button">📦 Pedidos</button>
      <button class="orders-tab ${_ordersVistaActual==='citas'?'active':''}" data-ovista="citas" type="button">📅 Citas</button>
    </div>`;

  if(_ordersVistaActual === 'citas'){
    return renderCitasInterno(cont, tabs);
  }

  const btnNuevo = `
    <button class="btn-nuevo-pedido" id="ped-nuevo">
      ➕ Nuevo pedido
    </button>`;

  if(!orders.length){
    cont.innerHTML = tabs + btnNuevo + `
      <div class="empty">
        <div class="ico">📦</div>
        <h3>Sin pedidos</h3>
        <p>Creá un pedido para tus clientes<br>y gestioná pagos, envíos y entregas.</p>
      </div>`;
    bindOrdersEvents();
    return;
  }

  const activos = orders.filter(o => o.estado === 'activo');
  const cerrados = orders.filter(o => o.estado === 'cerrado' || o.estado === 'cancelado');

  activos.sort((a, b) => a.fecha < b.fecha ? 1 : -1);
  cerrados.sort((a, b) => a.fecha < b.fecha ? 1 : -1);

  let html = tabs + btnNuevo;

  if(activos.length){
    html += `<div class="orders-section-title activos">
               🔴 Activos (${activos.length})
             </div>`;
    html += activos.map(orderCardHTML).join('');
  }

  if(cerrados.length){
    html += `<div class="orders-section-title cerrados">
               🟢 Cerrados (${cerrados.length})
             </div>`;
    html += cerrados.map(orderCardHTML).join('');
  }

  cont.innerHTML = html;
  bindOrdersEvents();
}

function orderCardHTML(o){
  const cliente = (window.DB.clients || []).find(c => c.id === o.clienteId);
  const clienteNombre = cliente ? cliente.nombre : (o.clienteNombre || 'Sin cliente');

  const totalItems = (o.items || []).reduce((s, i) => s + i.cantidad, 0);
  const resumen = totalItems + ' unidad' + (totalItems !== 1 ? 'es' : '');

  const fecha = fmtDateTime(o.fecha);

  const claseCard = o.estado === 'cerrado' ? 'cerrado'
                  : o.estado === 'cancelado' ? 'cancelado'
                  : '';

  const tasaSnap = o.tasaSnapshot || 0;
  const refHTML = tasaSnap > 0
    ? `<div class="order-ref">${fmtRefOnly(o.total, tasaSnap)}</div>`
    : '';

  const checksHTML = `
    <div class="order-checks-row">
      <div class="order-check-badge ${o.pagado ? 'done' : ''}">
        <span class="order-check-icon">${o.pagado ? '✓' : '💵'}</span>
        Pagado
      </div>
      <div class="order-check-badge ${o.enviado ? 'done' : ''}">
        <span class="order-check-icon">${o.enviado ? '✓' : '🚚'}</span>
        Enviado
      </div>
      <div class="order-check-badge ${o.entregado ? 'done' : ''}">
        <span class="order-check-icon">${o.entregado ? '✓' : '📬'}</span>
        Entregado
      </div>
    </div>`;

  return `
    <div class="order-card ${claseCard}" data-pedido="${o.id}">
      <div class="order-head">
        <div class="order-numero">${esc(o.numero)}</div>
        <div class="order-fecha">${fecha}</div>
      </div>

      <div class="order-cliente">
        <span>👤</span>
        <span>${esc(clienteNombre)}</span>
      </div>

      <div class="order-resumen">${resumen}</div>

      <div class="order-monto-row">
        <div>
          <div class="order-total">${fmt(o.total)}</div>
          ${refHTML}
        </div>
      </div>

      ${checksHTML}
    </div>`;
}

function bindOrdersEvents(){
  const btnNuevo = document.querySelector('#ped-nuevo');
  if(btnNuevo){
    btnNuevo.addEventListener('click', openNewOrder);
  }

  document.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.pedido;
      if(id) openOrderDetail(id);
    });
  });
}

function openNewOrder(){
  pedClienteId = null;
  pedCarrito = [];

  if(document.querySelector('#m-new-order')) return;

  const html = `
    <div class="overlay centered open" id="m-new-order">
      <div class="sheet" style="position:relative">
        <button class="x" id="pno-close">✕</button>
        <h2>📦 Nuevo pedido</h2>
        <div class="sub">Armá el pedido del cliente.</div>

        <label>Cliente <span style="color:var(--red);font-weight:900">*</span></label>

        <div class="cli-picker" id="pno-cli-picker">
          <button type="button" class="cli-picker-display" id="pno-cli-display">
            <span class="cli-picker-icon">👤</span>
            <span class="cli-picker-text" id="pno-cli-text">Elegir cliente</span>
            <span class="cli-picker-chevron">▾</span>
          </button>

          <div class="cli-picker-panel" id="pno-cli-panel">
            <input type="text"
                   id="pno-cli-search"
                   placeholder="Buscar cliente..."
                   autocomplete="off"
                   class="cli-picker-search">

            <button type="button" class="cli-picker-nuevo" id="pno-cli-nuevo">
              ➕ Agregar nuevo cliente
            </button>

            <div class="cli-picker-list" id="pno-cli-list"></div>
          </div>
        </div>

        <div class="ped-cliente-warning" id="pno-cli-warning">
          ⚠️ El cliente es obligatorio para crear un pedido
        </div>

        <div class="cli-form" id="pno-cli-form" style="display:none">
          <label>Nombre</label>
          <input id="pno-nuevo-nombre" placeholder="Ej: María Pérez">

          <label>Teléfono</label>
          <input id="pno-nuevo-telefono" type="tel" placeholder="Ej: 0412-1234567">

          <div style="display:flex;gap:8px;margin-top:14px">
            <button type="button" class="btn-ghost" id="pno-nuevo-cancel"
                    style="margin-top:0;flex:1">
              Cancelar
            </button>
            <button type="button" class="btn-main" id="pno-nuevo-save"
                    style="margin-top:0;flex:1">
              Guardar
            </button>
          </div>
        </div>

        <label>Productos</label>
        <div id="pno-items"></div>

        <button type="button" class="btn-ghost" id="pno-add-product">
          ➕ Agregar producto
        </button>

        <div class="ped-totales" id="pno-totales" style="display:none"></div>

        <button class="btn-main" id="pno-save">
          ✅ Crear pedido
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  renderPnoClienteList();
  renderPnoItems();
  updatePnoTotales();

  document.querySelector('#pno-close').addEventListener('click', closeNewOrder);
  document.querySelector('#m-new-order').addEventListener('click', e => {
    if(e.target.id === 'm-new-order') closeNewOrder();
  });

  document.querySelector('#pno-cli-display').addEventListener('click', togglePnoCliente);
  document.querySelector('#pno-cli-search').addEventListener('input', renderPnoClienteList);
  document.querySelector('#pno-cli-nuevo').addEventListener('click', mostrarFormPnoCliente);
  document.querySelector('#pno-nuevo-save').addEventListener('click', guardarPnoCliente);
  document.querySelector('#pno-nuevo-cancel').addEventListener('click', () => {
    document.querySelector('#pno-cli-form').style.display = 'none';
  });

  document.querySelector('#pno-add-product').addEventListener('click', openPnoPicker);
  document.querySelector('#pno-save').addEventListener('click', guardarNuevoPedido);
}

function closeNewOrder(){
  const el = document.querySelector('#m-new-order');
  if(el) el.remove();
  pedClienteId = null;
  pedCarrito = [];
}

function togglePnoCliente(){
  const picker = document.querySelector('#pno-cli-picker');
  const form = document.querySelector('#pno-cli-form');
  if(!picker) return;

  if(form) form.style.display = 'none';
  picker.classList.toggle('abierto');

  if(picker.classList.contains('abierto')){
    renderPnoClienteList();
    setTimeout(() => {
      const inp = document.querySelector('#pno-cli-search');
      if(inp) inp.focus();
    }, 200);
  }
}

function renderPnoClienteList(){
  const list = document.querySelector('#pno-cli-list');
  const search = document.querySelector('#pno-cli-search');
  if(!list) return;

  const q = normalize(search ? search.value : '');
  let clientes = [...(window.DB.clients || [])];

  if(q){
    clientes = clientes.filter(c =>
      normalize(c.nombre).includes(q) ||
      normalize(c.cedula || '').includes(q) ||
      normalize(c.telefono || '').includes(q)
    );
  }

  clientes.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity:'base' })
  );

  if(!clientes.length){
    list.innerHTML = `<div class="cli-picker-vacio">
      ${q ? 'Sin resultados' : 'Sin clientes guardados'}
    </div>`;
    return;
  }

  list.innerHTML = clientes.map(c => {
    const inicial = esc((c.nombre || '?').charAt(0).toUpperCase());
    const meta = [];
    if(c.cedula) meta.push(esc(c.cedula));
    if(c.telefono) meta.push(esc(c.telefono));

    return `
      <div class="cli-picker-item" data-cli="${c.id}">
        <div class="cli-picker-item-avatar">${inicial}</div>
        <div class="cli-picker-item-info">
          <div class="cli-picker-item-nombre">${esc(c.nombre)}</div>
          ${meta.length ? `<div class="cli-picker-item-meta">${meta.join(' · ')}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.cli-picker-item').forEach(el => {
    el.addEventListener('click', () => {
      seleccionarClientePedido(el.dataset.cli);
    });
  });
}

function seleccionarClientePedido(clienteId){
  const cli = (window.DB.clients || []).find(c => c.id === clienteId);
  if(!cli) return;

  pedClienteId = clienteId;

  const text = document.querySelector('#pno-cli-text');
  const picker = document.querySelector('#pno-cli-picker');
  const warning = document.querySelector('#pno-cli-warning');

  if(text){
    text.textContent = cli.nombre;
    text.classList.add('asignado');
  }
  if(picker) picker.classList.remove('abierto');
  if(warning) warning.classList.remove('show');

  if(navigator.vibrate) navigator.vibrate(10);
}

function mostrarFormPnoCliente(){
  const picker = document.querySelector('#pno-cli-picker');
  const form = document.querySelector('#pno-cli-form');
  if(!form) return;

  if(picker) picker.classList.remove('abierto');
  form.style.display = 'block';

  const n = document.querySelector('#pno-nuevo-nombre');
  const t = document.querySelector('#pno-nuevo-telefono');

  if(n) n.value = '';
  if(t) t.value = '';

  setTimeout(() => { if(n) n.focus(); }, 200);
}

function guardarPnoCliente(){
  const n = document.querySelector('#pno-nuevo-nombre');
  const t = document.querySelector('#pno-nuevo-telefono');

  const nombre = n ? n.value.trim() : '';
  if(!nombre) return toast('⚠️ El nombre es obligatorio');

  const nuevo = {
    id: 'cli_' + uid(),
    nombre,
    cedula: '',
    telefono: t ? t.value.trim() : '',
    pais: '',
    notas: '',
    creado: Date.now()
  };

  if(!window.DB.clients) window.DB.clients = [];
  window.DB.clients.push(nuevo);
  saveDB();

  pedClienteId = nuevo.id;

  const text = document.querySelector('#pno-cli-text');
  if(text){
    text.textContent = nombre;
    text.classList.add('asignado');
  }

  const form = document.querySelector('#pno-cli-form');
  if(form) form.style.display = 'none';

  toast('✅ Cliente creado');
}
/* =========================================================
   views/orders.js — PARTE 2/3
   Items del pedido + picker productos + guardar pedido
   ========================================================= */

function renderPnoItems(){
  const cont = document.querySelector('#pno-items');
  if(!cont) return;

  if(!pedCarrito.length){
    cont.innerHTML = `
      <div style="background:var(--bg3);border-radius:12px;
                  padding:16px;text-align:center;color:var(--dim);
                  font-size:12px;font-weight:600;margin-top:8px">
        Sin productos todavía
      </div>`;
    return;
  }

  cont.innerHTML = pedCarrito.map((item, idx) => {
    const p = window.DB.products.find(x => x.id === item.productoId);
    if(!p) return '';

    const thumb = buildThumb(p, 40);
    const subtotal = item.cantidad * item.precioUnitario;

    return `
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
          <button class="cart-item-btn" data-pno-mod="${idx}" data-pno-delta="-1" type="button">−</button>
          <span class="cart-item-cant">${item.cantidad}</span>
          <button class="cart-item-btn" data-pno-mod="${idx}" data-pno-delta="1" type="button">+</button>
          <button class="cart-item-del" data-pno-del="${idx}" type="button">🗑️</button>
        </div>
      </div>`;
  }).join('');

  cont.querySelectorAll('[data-pno-mod]').forEach(btn => {
    btn.addEventListener('click', () => {
      pnoModificar(+btn.dataset.pnoMod, +btn.dataset.pnoDelta);
    });
  });

  cont.querySelectorAll('[data-pno-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      pedCarrito.splice(+btn.dataset.pnoDel, 1);
      renderPnoItems();
      updatePnoTotales();
    });
  });
}

function pnoModificar(idx, delta){
  const item = pedCarrito[idx];
  if(!item) return;

  const p = window.DB.products.find(x => x.id === item.productoId);
  if(!p) return;

  const c = calc(p);
  const nuevaCant = item.cantidad + delta;

  if(nuevaCant <= 0){
    pedCarrito.splice(idx, 1);
    renderPnoItems();
    updatePnoTotales();
    return;
  }

  if(nuevaCant > c.stock){
    toast(`⚠️ Solo hay ${c.stock} unidades`);
    return;
  }

  item.cantidad = nuevaCant;
  renderPnoItems();
  updatePnoTotales();
}

function updatePnoTotales(){
  const cont = document.querySelector('#pno-totales');
  if(!cont) return;

  if(!pedCarrito.length){
    cont.style.display = 'none';
    return;
  }

  cont.style.display = 'block';

  let totalUSD = 0;
  pedCarrito.forEach(item => {
    totalUSD += item.cantidad * item.precioUnitario;
  });

  const ref = fmtRefOnly(totalUSD);

  cont.innerHTML = `
    <div class="ped-total-line">
      <span>Total</span>
      <b>${fmt(totalUSD)}</b>
    </div>
    ${ref ? `<div class="ped-ref">${ref}</div>` : ''}`;
}

function openPnoPicker(){
  if(document.querySelector('#pno-picker')) return;

  const html = `
    <div class="overlay centered open" id="pno-picker">
      <div class="sheet" style="position:relative">
        <button class="x" id="ppk-close">✕</button>
        <h2>Agregar producto</h2>
        <div class="sub">Elegí productos para el pedido</div>

        <div class="inv-search" style="margin-top:10px">
          <input type="text"
                 id="ppk-input"
                 placeholder="Buscar producto..."
                 autocomplete="off"
                 style="padding-right:80px">
          <button class="inv-search-scan" id="ppk-scan" type="button" aria-label="Escanear">📷</button>
        </div>

        <div id="ppk-list" class="picker-list"></div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  renderPnoPickerList();

  document.querySelector('#ppk-close').addEventListener('click', () => {
    document.querySelector('#pno-picker').remove();
  });

  document.querySelector('#ppk-input').addEventListener('input', renderPnoPickerList);

  document.querySelector('#ppk-scan').addEventListener('click', () => {
    openScanner(code => {
      const p = window.DB.products.find(x => x.codigoBarras === code);
      if(p){
        agregarProductoAlPedido(p.id);
      } else {
        toast('🔍 No hay producto con ese código');
      }
    });
  });

  document.querySelector('#pno-picker').addEventListener('click', e => {
    if(e.target.id === 'pno-picker') e.target.remove();
  });

  setTimeout(() => {
    const inp = document.querySelector('#ppk-input');
    if(inp) inp.focus();
  }, 300);
}

function renderPnoPickerList(){
  const cont = document.querySelector('#ppk-list');
  const input = document.querySelector('#ppk-input');
  if(!cont) return;

  const q = normalize(input ? input.value : '');
  let lista = [...window.DB.products];

  if(q){
    lista = lista.filter(p => normalize(p.nombre).includes(q));
  }

  lista = lista.filter(p => {
    /* Solo vendibles */
    if(typeof esVendible === 'function' && !esVendible(p)) return false;

    const c = calc(p);
    const t = tipoDe(p);

    if(t === 'servicio') return true;
    if(t === 'receta') return c.stockDisponible > 0 || c.stockInfinito;
    return c.stock > 0;
  });

  if(!lista.length){
    cont.innerHTML = `
      <div class="empty" style="padding:30px 10px">
        <div class="ico">📦</div>
        <h3>Sin productos</h3>
        <p>${q ? 'Ninguno coincide' : 'No hay productos con stock'}</p>
      </div>`;
    return;
  }

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
    el.addEventListener('click', () => agregarProductoAlPedido(el.dataset.id));
  });
}

function agregarProductoAlPedido(productoId){
  const p = window.DB.products.find(x => x.id === productoId);
  if(!p) return;

  const c = calc(p);
  if(c.stock <= 0){
    toast('⚠️ Sin stock');
    return;
  }

  const existente = pedCarrito.find(i => i.productoId === productoId);

  if(existente){
    if(existente.cantidad + 1 > c.stock){
      toast(`⚠️ Solo hay ${c.stock} unidades`);
      return;
    }
    existente.cantidad += 1;
  } else {
    pedCarrito.push({
      productoId,
      cantidad: 1,
      precioUnitario: c.precioVenta,
      unidad: p.unidad || 'unidad'
    });
  }

  renderPnoItems();
  updatePnoTotales();

  if(navigator.vibrate) navigator.vibrate(15);
  toast(`✅ ${p.nombre} agregado`);

  if(pedPickerModo === 'single'){
    const picker = document.querySelector('#pno-picker');
    if(picker) picker.remove();
  }
}

function guardarNuevoPedido(){
  if(!pedClienteId){
    const warning = document.querySelector('#pno-cli-warning');
    if(warning) warning.classList.add('show');

    const picker = document.querySelector('#pno-cli-picker');
    if(picker && !picker.classList.contains('abierto')){
      togglePnoCliente();
    }
    return toast('⚠️ Elegí un cliente');
  }

  if(!pedCarrito.length){
    return toast('⚠️ Agregá al menos un producto');
  }

  for(const item of pedCarrito){
    const p = window.DB.products.find(x => x.id === item.productoId);
    if(!p) continue;
    const c = calc(p);
    const t = tipoDe(p);

    /* Servicios: siempre ok */
    if(t === 'servicio') continue;

    /* Recetas: validar materiales */
    if(t === 'receta'){
      if(c.stockInfinito) continue;
      if(c.stockDisponible < item.cantidad){
        return toast(`⚠️ "${p.nombre}": solo alcanza para ${c.stockDisponible}`);
      }
      continue;
    }

    /* Productos y materiales */
    const disponible = c.stock - getReservadoProducto(item.productoId);
    if(item.cantidad > disponible){
      return toast(`⚠️ "${p.nombre}" solo tiene ${disponible} disponibles`);
    }
  }

  let totalUSD = 0;
  let gananciaTotal = 0;

  const itemsDetallados = pedCarrito.map(item => {
    const p = window.DB.products.find(x => x.id === item.productoId);
    const c = calc(p);
    const costoVenta = calcularCostoFIFO(c.lotes, item.cantidad);
    const subtotal = item.cantidad * item.precioUnitario;
    const ganancia = subtotal - costoVenta;

    totalUSD += subtotal;
    gananciaTotal += ganancia;

    return {
      productoId: item.productoId,
      nombre: p.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      costoUnitario: item.cantidad > 0 ? costoVenta / item.cantidad : 0,
      loteId: getLoteAsignado(c.lotes, item.cantidad)
    };
  });

  const cliente = (window.DB.clients || []).find(c => c.id === pedClienteId);

  const numero = generarNumeroPedido(todayISO());

  const tasaSnap = Number(window.DB.settings.tasaDia) || 0;
  const refSnap  = window.DB.settings.refCurrency || null;

  const nuevoPedido = {
    id: 'ped_' + uid(),
    numero,
    fecha: new Date().toISOString().slice(0, 19),
    clienteId: pedClienteId,
    clienteNombre: cliente ? cliente.nombre : '',
    items: itemsDetallados,
    total: totalUSD,
    ganancia: gananciaTotal,
    estado: 'activo',
    pagado: false,
    enviado: false,
    entregado: false,
    comprobante: null,
    tasaSnapshot: tasaSnap > 0 ? tasaSnap : null,
    refCurrencySnapshot: tasaSnap > 0 ? refSnap : null,
    ticketId: null
  };

  window.DB.orders.push(nuevoPedido);

  saveDB();
  closeNewOrder();
  renderOrders();

  toast(`✅ Pedido ${numero} creado`);

  if(navigator.vibrate) navigator.vibrate(20);
}
/* =========================================================
   views/orders.js — PARTE 3/3
   Detalle + checks + comprobante + cerrar/cancelar + WhatsApp
   v11: comprobantes en IndexedDB
   ========================================================= */

function openOrderDetail(pedidoId){
  const o = (window.DB.orders || []).find(x => x.id === pedidoId);
  if(!o){ toast('⚠️ Pedido no encontrado'); return; }

  if(document.querySelector('#m-order-detail')) return;

  const cliente = (window.DB.clients || []).find(c => c.id === o.clienteId);
  const clienteNombre = cliente ? cliente.nombre : (o.clienteNombre || 'Sin cliente');

  const itemsHTML = (o.items || []).map(item => {
    const subtotal = item.cantidad * item.precioUnitario;
    return `
      <div class="ped-item">
        <div class="ped-item-info">
          <div class="ped-item-nombre">${esc(item.nombre)}</div>
          <div class="ped-item-meta">${item.cantidad} × ${fmt(item.precioUnitario)}</div>
        </div>
        <div class="ped-item-total">${fmt(subtotal)}</div>
      </div>`;
  }).join('');

  const refTotal = o.tasaSnapshot > 0
    ? `<div class="ped-ref">${fmtRefOnly(o.total, o.tasaSnapshot)}</div>`
    : '';

  const comprobanteHTML = o.comprobante
    ? buildComprobantePreview(o.comprobante, pedidoId)
    : '';

  const todosListos = o.pagado && o.enviado && o.entregado;
  const bannerListo = todosListos
    ? `<div class="ped-listos-banner">
         <div class="icon">🎉</div>
         <div class="titulo">¡Pedido completo!</div>
         <div class="sub">Cerrá el pedido para descontar del stock</div>
       </div>`
    : '';

  const html = `
    <div class="overlay centered open" id="m-order-detail">
      <div class="sheet" style="position:relative">
        <button class="x" id="pod-close">✕</button>

        <div class="ped-detalle-header">
          <div class="ped-numero-grande">${esc(o.numero)}</div>
          <div class="ped-fecha-grande">${fmtDateTime(o.fecha)}</div>
          <div class="ped-cliente-box">
            <span>👤</span>
            <span>${esc(clienteNombre)}</span>
          </div>
        </div>

        <div class="ped-items">${itemsHTML}</div>

        <div class="ped-totales">
          <div class="ped-total-line">
            <span>Total</span>
            <b>${fmt(o.total)}</b>
          </div>
          ${refTotal}
          <div class="ped-ganancia">
            Ganancia: ${o.ganancia >= 0 ? '+' : ''}${fmt(o.ganancia)}
          </div>
        </div>

        ${comprobanteHTML}

        <div class="ped-checks-title">Estado del pedido</div>

        <div class="ped-check-row ${o.pagado ? 'done' : ''}" data-check="pagado">
          <div class="ped-check-circle">${o.pagado ? '✓' : '💵'}</div>
          <div class="ped-check-info">
            <div class="ped-check-label">Pagado</div>
            <div class="ped-check-sub">
              ${o.pagado ? 'Confirmado' : 'Tocá para registrar pago'}
            </div>
          </div>
        </div>

        <div class="ped-check-row ${o.enviado ? 'done' : ''}" data-check="enviado">
          <div class="ped-check-circle">${o.enviado ? '✓' : '🚚'}</div>
          <div class="ped-check-info">
            <div class="ped-check-label">Enviado</div>
            <div class="ped-check-sub">
              ${o.enviado ? 'Ya salió' : 'Tocá cuando salga'}
            </div>
          </div>
        </div>

        <div class="ped-check-row ${o.entregado ? 'done' : ''}" data-check="entregado">
          <div class="ped-check-circle">${o.entregado ? '✓' : '📬'}</div>
          <div class="ped-check-info">
            <div class="ped-check-label">Entregado</div>
            <div class="ped-check-sub">
              ${o.entregado ? 'Recibido por el cliente' : 'Tocá cuando llegue'}
            </div>
          </div>
        </div>

        ${bannerListo}

        ${todosListos && o.estado === 'activo' ? `
          <button class="btn-main" id="pod-cerrar">
            ✅ Cerrar pedido y descontar stock
          </button>
        ` : ''}

        ${o.estado !== 'cancelado' ? `
          <button class="btn-ghost" id="pod-png">
            📤 Compartir factura
          </button>
        ` : ''}

        ${o.estado === 'activo' ? `
          <button class="btn-whatsapp" id="pod-wa">
            💬 Compartir por WhatsApp
          </button>
          <button class="btn-ghost btn-danger" id="pod-cancel">
            🚫 Cancelar pedido
          </button>
        ` : ''}
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#pod-close').addEventListener('click', () => {
    document.querySelector('#m-order-detail').remove();
  });

  document.querySelector('#m-order-detail').addEventListener('click', e => {
    if(e.target.id === 'm-order-detail') e.target.remove();
  });

  document.querySelectorAll('[data-check]').forEach(row => {
    row.addEventListener('click', () => {
      const tipo = row.dataset.check;
      manejarCheck(pedidoId, tipo);
    });
  });

  const btnCerrar = document.querySelector('#pod-cerrar');
  if(btnCerrar){
    btnCerrar.addEventListener('click', () => cerrarPedido(pedidoId));
  }

  const btnWA = document.querySelector('#pod-wa');
  if(btnWA){
    btnWA.addEventListener('click', () => compartirPedidoWhatsApp(pedidoId));
  }

  const btnPng = document.querySelector('#pod-png');
  if(btnPng){
    btnPng.addEventListener('click', () => compartirFacturaPedidoPNG(pedidoId));
  }

  const btnCancel = document.querySelector('#pod-cancel');
  if(btnCancel){
    btnCancel.addEventListener('click', () => cancelarPedido(pedidoId));
  }
}

function buildComprobantePreview(c, pedidoId){
  if(!c) return '';

  if(c.tipo === 'efectivo'){
    return `<div class="ped-comprobante-badge">💵 Pago en efectivo</div>`;
  }

  if(c.tipo === 'debito'){
    return `<div class="ped-comprobante-badge" style="background:rgba(59,130,246,.14);color:#60a5fa">💳 Débito</div>`;
  }

  if(c.tipo === 'pago-movil'){
    return `<div class="ped-comprobante-badge" style="background:rgba(59,130,246,.14);color:#60a5fa">📱 Pago Móvil</div>`;
  }

  if(c.tipo === 'texto'){
    return `<div class="ped-comprobante-badge">
              📝 Ref: ${esc(c.valor || '—')}
            </div>`;
  }

  if(c.tipo === 'imagen'){
    const comprob = window.COMPROBANTES && window.COMPROBANTES[pedidoId];
    const img = comprob && comprob.imagen ? comprob.imagen : null;

    if(!img) return '';

    return `
      <div style="margin-top:10px">
        <div style="font-size:11px;color:var(--dim);font-weight:800;
                    text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">
          📷 Comprobante
        </div>
        <div class="comprob-preview" style="max-height:180px">
          <img src="${img}" alt="Comprobante">
        </div>
      </div>`;
  }

  return '';
}

async function manejarCheck(pedidoId, tipo){
  const o = (window.DB.orders || []).find(x => x.id === pedidoId);
  if(!o) return;

  if(o.estado !== 'activo'){
    return toast('⚠️ Este pedido ya está cerrado');
  }

  if(tipo === 'pagado'){
    if(o.pagado){
      const ok = await confirmarAccion({
        titulo: '¿Quitar comprobante?',
        mensaje: 'El check de pagado se va a desmarcar.',
        botonOk: 'Quitar',
        botonCancel: 'Cancelar',
        colorOk: 'rojo'
      });
      if(!ok) return;

      o.pagado = false;
      o.comprobante = null;

      try{
        await eliminarComprobanteDB(pedidoId);
      }catch(e){
        console.warn('No se pudo borrar el comprobante:', e);
      }
      delete window.COMPROBANTES[pedidoId];

      saveDB();

      document.querySelector('#m-order-detail').remove();
      setTimeout(() => openOrderDetail(pedidoId), 150);
      return;
    }

    openComprobanteModal(pedidoId);
    return;
  }

  o[tipo] = !o[tipo];
  saveDB();

  if(navigator.vibrate) navigator.vibrate(15);

  document.querySelector('#m-order-detail').remove();
  setTimeout(() => openOrderDetail(pedidoId), 150);

  if(o[tipo]){
    const labels = { enviado: 'Enviado', entregado: 'Entregado' };
    toast(`✅ ${labels[tipo]} marcado`);
  }
}

let comprobTipo = null;
let comprobImagen = null;

function openComprobanteModal(pedidoId){
  comprobTipo = null;
  comprobImagen = null;

  if(document.querySelector('#m-comprobante')) return;

  const html = `
    <div class="overlay centered open" id="m-comprobante">
      <div class="sheet" style="position:relative;max-width:420px">
        <button class="x" id="comp-close">✕</button>
        <h2>💵 Comprobante de pago</h2>
        <div class="sub">¿Cómo pagó el cliente?</div>

        <div class="comprob-tipo-selector">
          <button type="button" class="comprob-tipo-btn" data-tipo="efectivo">
            <span class="icon">💵</span>
            Efectivo
          </button>
          <button type="button" class="comprob-tipo-btn" data-tipo="debito">
            <span class="icon">💳</span>
            Débito
          </button>
          <button type="button" class="comprob-tipo-btn" data-tipo="pago-movil">
            <span class="icon">📱</span>
            Pago Móvil
          </button>
          <button type="button" class="comprob-tipo-btn" data-tipo="texto">
            <span class="icon">📝</span>
            Referencia
          </button>
          <button type="button" class="comprob-tipo-btn" data-tipo="imagen">
            <span class="icon">📷</span>
            Captura
          </button>
        </div>

        <div id="comp-extra"></div>

        <button class="btn-main" id="comp-save" disabled>
          ✅ Confirmar pago
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#comp-close').addEventListener('click', () => {
    document.querySelector('#m-comprobante').remove();
  });

  document.querySelector('#m-comprobante').addEventListener('click', e => {
    if(e.target.id === 'm-comprobante') e.target.remove();
  });

  document.querySelectorAll('.comprob-tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      comprobTipo = btn.dataset.tipo;
      comprobImagen = null;

      document.querySelectorAll('.comprob-tipo-btn').forEach(b =>
        b.classList.toggle('active', b === btn)
      );

      renderComprobExtra(pedidoId);
    });
  });
}

function renderComprobExtra(pedidoId){
  const cont = document.querySelector('#comp-extra');
  const btnSave = document.querySelector('#comp-save');
  if(!cont) return;

  if(comprobTipo === 'efectivo'){
    cont.innerHTML = `
      <div style="background:rgba(34,197,94,.14);border-radius:10px;
                  padding:14px;text-align:center;margin-top:14px;
                  font-size:13px;font-weight:800;color:var(--green)">
        💵 El cliente pagó en efectivo
      </div>`;
    if(btnSave) btnSave.disabled = false;
  }

  else if(comprobTipo === 'debito'){
    cont.innerHTML = `
      <div style="background:rgba(59,130,246,.14);border-radius:10px;
                  padding:14px;text-align:center;margin-top:14px;
                  font-size:13px;font-weight:800;color:#60a5fa">
        💳 El cliente pagó con Débito
      </div>`;
    if(btnSave) btnSave.disabled = false;
  }

  else if(comprobTipo === 'pago-movil'){
    const qr = (window.DB.settings.business || {}).qrPagoMovil;
    if(qr){
      cont.innerHTML = `
        <div class="pm-qr-display" style="margin-top:14px">
          <div class="pm-qr-display-label">📱 Escaneá para pagar</div>
          <img src="${qr}" alt="QR Pago Móvil">
        </div>`;
      if(btnSave) btnSave.disabled = false;
    } else {
      cont.innerHTML = `
        <div style="background:rgba(245,158,11,.14);border-radius:10px;
                    padding:14px;text-align:center;margin-top:14px;
                    font-size:13px;font-weight:800;color:var(--amber);
                    line-height:1.5">
          ⚠️ No configuraste tu QR de Pago Móvil.<br>
          Andá a <b>🏪 Mi negocio</b> y cargalo.
        </div>`;
      if(btnSave) btnSave.disabled = true;
    }
  }

  else if(comprobTipo === 'texto'){
    cont.innerHTML = `
      <label>Número de referencia</label>
      <input id="comp-ref-input" placeholder="Ej: 123456789"
             autocomplete="off">
    `;
    const input = document.querySelector('#comp-ref-input');
    if(input){
      input.addEventListener('input', () => {
        if(btnSave) btnSave.disabled = !input.value.trim();
      });
      setTimeout(() => input.focus(), 200);
    }
    if(btnSave) btnSave.disabled = true;
  }

  else if(comprobTipo === 'imagen'){
    cont.innerHTML = `
      <label>Captura de pantalla</label>
      <div class="comprob-preview" id="comp-prev" style="min-height:120px">
        <div style="color:var(--dim);font-size:13px;font-weight:700;
                    text-align:center">
          📷 Tocá para elegir la imagen
        </div>
      </div>
      <input type="file" id="comp-file" accept="image/*">
    `;

    const prev = document.querySelector('#comp-prev');
    const file = document.querySelector('#comp-file');

    if(prev && file){
      prev.addEventListener('click', () => file.click());
      file.addEventListener('change', async e => {
        const f = e.target.files[0];
        if(!f) return;
        comprobImagen = await resizeImage(f, 500, 0.7);
        prev.innerHTML = `<img src="${comprobImagen}" alt="">`;
        if(btnSave) btnSave.disabled = false;
      });
    }
    if(btnSave) btnSave.disabled = true;
  }

  if(btnSave){
    btnSave.onclick = () => guardarComprobante(pedidoId);
  }
}

async function guardarComprobante(pedidoId){
  const o = (window.DB.orders || []).find(x => x.id === pedidoId);
  if(!o) return;

  let comprobante = null;
  let imagenParaDB = null;

  if(comprobTipo === 'efectivo'){
    comprobante = { tipo: 'efectivo' };

  } else if(comprobTipo === 'debito'){
    comprobante = { tipo: 'debito' };

  } else if(comprobTipo === 'pago-movil'){
    comprobante = { tipo: 'pago-movil' };

  } else if(comprobTipo === 'texto'){
    const input = document.querySelector('#comp-ref-input');
    const valor = input ? input.value.trim() : '';
    if(!valor) return toast('⚠️ Ingresá la referencia');
    comprobante = { tipo: 'texto', valor };

  } else if(comprobTipo === 'imagen'){
    if(!comprobImagen) return toast('⚠️ Elegí una imagen');
    comprobante = { tipo: 'imagen' };
    imagenParaDB = comprobImagen;
  }

  try{
    if(imagenParaDB){
      const comprobConImagen = { tipo: 'imagen', imagen: imagenParaDB };
      await guardarComprobanteDB(pedidoId, comprobConImagen);
      window.COMPROBANTES[pedidoId] = comprobConImagen;
    } else {
      await eliminarComprobanteDB(pedidoId);
      delete window.COMPROBANTES[pedidoId];
    }
  }catch(e){
    console.error('Error al guardar comprobante:', e);
    return toast('⚠️ No se pudo guardar la imagen');
  }

  o.comprobante = comprobante;
  o.pagado = true;
  saveDB();

  document.querySelector('#m-comprobante').remove();
  document.querySelector('#m-order-detail').remove();

  setTimeout(() => openOrderDetail(pedidoId), 150);

  if(navigator.vibrate) navigator.vibrate(20);
  toast('✅ Pago registrado');
}

async function cerrarPedido(pedidoId){
  const o = (window.DB.orders || []).find(x => x.id === pedidoId);
  if(!o) return;

  const totalUnidades = o.items.reduce((s, i) => s + i.cantidad, 0);

  const ok = await confirmarAccion({
    titulo: '¿Cerrar el pedido?',
    mensaje: 'Se descontarán ' + totalUnidades +
             ' unidades del stock real.\nEsta acción no se puede deshacer.',
    botonOk: 'Cerrar pedido',
    botonCancel: 'Cancelar',
    colorOk: 'verde'
  });

  if(!ok) return;

  const ticketId = 't_' + uid();
  const numero = generarNumeroTicket(todayISO());
  const hora = new Date().toTimeString().slice(0, 8);
  const fechaISO = todayISO() + 'T' + hora;

  const ticket = {
    id: ticketId,
    numero,
    fecha: fechaISO,
    clienteId: o.clienteId,
    clienteNombre: o.clienteNombre,
    items: o.items.map(i => ({
      productoId: i.productoId,
      nombre: i.nombre,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
      costoUnitario: i.costoUnitario
    })),
    total: o.total,
    ganancia: o.ganancia,
    tasaSnapshot: o.tasaSnapshot,
    refCurrencySnapshot: o.refCurrencySnapshot,
    pedidoId: o.id
  };

  window.DB.tickets.push(ticket);

  o.items.forEach(item => {
    const p = window.DB.products.find(x => x.id === item.productoId);
    if(!p) return;

    const t = tipoDe(p);

    /* Receta: registrar venta + descontar materiales */
    if(t === 'receta'){
      p.ventas = p.ventas || [];
      p.ventas.push({
        id: uid(),
        ticketId,
        numero,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        costoUnitario: item.costoUnitario,
        fecha: fechaISO,
        tasaSnapshot: o.tasaSnapshot,
        refCurrencySnapshot: o.refCurrencySnapshot,
        cliente: o.clienteId
      });

      /* Descontar cada material (FIFO) */
      const comps = Array.isArray(p.componentes) ? p.componentes : [];
      const explotado = explotarComponentes(comps, 0);

      explotado.forEach(comp => {
        const mat = window.DB.products.find(x => x.id === comp.materialId);
        if(!mat) return;

        let restante = comp.cantidad * item.cantidad;

        /* Aplicar FIFO sobre los lotes */
        (mat.lotes || []).forEach(lote => {
          if(restante <= 0) return;
          const consumir = Math.min(restante, lote.unidadesCompradas);
          restante -= consumir;

          mat.ventas = mat.ventas || [];
          mat.ventas.push({
            id: uid(),
            ticketId,
            numero,
            cantidad: consumir,
            precioUnitario: 0,
            costoUnitario: lote.costoUnitario,
            loteId: lote.id,
            fecha: fechaISO,
            usoInterno: true,
            recetaOrigen: p.nombre
          });
        });
      });
      return;
    }

    /* Productos, materiales, servicios: venta directa */
    p.ventas = p.ventas || [];
    p.ventas.push({
      id: uid(),
      ticketId,
      numero,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      costoUnitario: item.costoUnitario,
      loteId: item.loteId,
      fecha: fechaISO,
      tasaSnapshot: o.tasaSnapshot,
      refCurrencySnapshot: o.refCurrencySnapshot,
      cliente: o.clienteId
    });
  });

  o.estado = 'cerrado';
  o.ticketId = ticketId;

  saveDB();

  document.querySelector('#m-order-detail').remove();
  renderOrders();
  renderAll();

  if(navigator.vibrate) navigator.vibrate(30);
  toast(`✅ Pedido cerrado · Ticket ${numero}`);
}

async function cancelarPedido(pedidoId){
  const o = (window.DB.orders || []).find(x => x.id === pedidoId);
  if(!o) return;

  const ok = await confirmarAccion({
    titulo: '¿Cancelar el pedido?',
    mensaje: 'Se liberará el stock reservado.\nEl pedido quedará como cancelado.',
    botonOk: 'Cancelar pedido',
    botonCancel: 'Volver',
    colorOk: 'rojo'
  });

  if(!ok) return;

  o.estado = 'cancelado';

  /* Limpiar comprobante de IndexedDB */
  try{
    await eliminarComprobanteDB(pedidoId);
  }catch(e){
    console.warn('No se pudo borrar comprobante:', e);
  }
  delete window.COMPROBANTES[pedidoId];

  saveDB();

  document.querySelector('#m-order-detail').remove();
  renderOrders();

  if(navigator.vibrate) navigator.vibrate(20);
  toast('🚫 Pedido cancelado');
}

function compartirPedidoWhatsApp(pedidoId){
  const o = (window.DB.orders || []).find(x => x.id === pedidoId);
  if(!o) return;

  const cliente = (window.DB.clients || []).find(c => c.id === o.clienteId);
  if(!cliente || !cliente.telefono){
    toast('⚠️ El cliente no tiene teléfono');
    return;
  }

  const items = (o.items || []).map(i =>
    `- ${i.cantidad} × ${i.nombre} = ${fmt(i.cantidad * i.precioUnitario)}`
  ).join('\n');

  const negocio = (window.DB.settings.business || {}).nombre || 'Stoki';

  const mensaje = `Hola ${cliente.nombre}, te paso el detalle de tu pedido:\n\n` +
                  `${o.numero}\n${items}\n\n` +
                  `TOTAL: ${fmt(o.total)}\n\n` +
                  `Saludos,\n${negocio}`;

  const numero = limpiarTelefono(cliente.telefono, cliente.pais);

  if(!numero){
    toast('⚠️ Teléfono inválido');
    return;
  }

  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');

  toast('💬 Abriendo WhatsApp...');
}

function getReservadoProducto(productoId){
  let reservado = 0;

  (window.DB.orders || []).forEach(o => {
    if(o.estado !== 'activo') return;

    (o.items || []).forEach(item => {
      if(item.productoId === productoId){
        reservado += item.cantidad;
      }
    });
  });

  return reservado;
}

function initOrders(){
  /* Nada específico por ahora */
}

/* ═══════════════════════════════════════════
   CITAS — Pestaña dentro de Pedidos
   ═══════════════════════════════════════════ */
function renderCitasInterno(cont, tabs){
  const hoy = todayISO();
  const citas = (window.DB.orders || []).filter(o => o.tipo === 'cita');

  /* Agrupar por fecha */
  const porFecha = {};
  citas.forEach(c => {
    const fecha = c.fechaCita || hoy;
    if(!porFecha[fecha]) porFecha[fecha] = [];
    porFecha[fecha].push(c);
  });

  /* Fechas ordenadas */
  const fechas = Object.keys(porFecha).sort();

  let secciones = '';

  /* Próximas / hoy */
  fechas.forEach(fecha => {
    const lista = porFecha[fecha].sort((a, b) =>
      (a.horaCita || '00:00').localeCompare(b.horaCita || '00:00')
    );

    const esHoy = fecha === hoy;
    const esPasado = fecha < hoy;

    /* Ocultar muy pasadas */
    if(esPasado && fecha < new Date(Date.now() - 7*86400000).toISOString().slice(0,10)) return;

    let titulo;
    if(esHoy) titulo = 'HOY';
    else if(fecha === new Date(Date.now() + 86400000).toISOString().slice(0,10)) titulo = 'MAÑANA';
    else titulo = fecha.split('-').reverse().slice(0,2).join('/');

    secciones += `
      <div class="cita-seccion">
        <div class="cita-fecha ${esHoy?'hoy':''} ${esPasado?'pasada':''}">${titulo}</div>
        ${lista.map(c => citaRowHTML(c)).join('')}
      </div>`;
  });

  if(!secciones){
    secciones = `
      <div class="empty">
        <div class="ico">📅</div>
        <h3>Sin citas</h3>
        <p>Creá tu primera cita para agendar<br>servicios con tus clientes.</p>
      </div>`;
  }

  const btnNuevo = `
    <button class="btn-nuevo-pedido" id="cita-nueva" style="background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff">
      ➕ Nueva cita
    </button>`;

  cont.innerHTML = tabs + btnNuevo + secciones;
  bindOrdersEvents();
  bindCitasEvents();
}

function citaRowHTML(o){
  const cliente = (window.DB.clients || []).find(c => c.id === o.clienteId);
  const clienteNombre = cliente ? cliente.nombre : (o.clienteNombre || 'Sin cliente');

  const totalItems = (o.items || []).reduce((s, i) => s + i.cantidad, 0);
  const hora = o.horaCita || o.fecha.slice(11, 16);

  const claseEstado = o.estado === 'cerrado' ? 'cerrada'
                     : o.estado === 'cancelado' ? 'cancelada'
                     : 'activa';

  const refHTML = o.tasaSnapshot > 0
    ? `<div class="order-ref">${fmtRefOnly(o.total, o.tasaSnapshot)}</div>`
    : '';

  const checksHTML = `
    <div class="order-checks-row">
      <div class="order-check-badge ${o.pagado ? 'done' : ''}">
        <span class="order-check-icon">${o.pagado ? '✓' : '💵'}</span>
        Pagado
      </div>
      <div class="order-check-badge ${o.completado ? 'done' : ''}">
        <span class="order-check-icon">${o.completado ? '✓' : '✅'}</span>
        Completado
      </div>
    </div>`;

  return `
    <div class="order-card cita ${claseEstado}" data-pedido="${o.id}">
      <div class="order-head">
        <div class="order-numero">⏰ ${esc(hora)}</div>
        <div class="order-fecha">${esc(o.numero)}</div>
      </div>

      <div class="order-cliente">
        <span>👤</span>
        <span>${esc(clienteNombre)}</span>
      </div>

      <div class="order-resumen">${totalItems} ${totalItems === 1 ? 'servicio' : 'servicios'}</div>

      <div class="order-monto-row">
        <div>
          <div class="order-total">${fmt(o.total)}</div>
          ${refHTML}
        </div>
      </div>

      ${checksHTML}
    </div>`;
}

function bindCitasEvents(){
  /* Tab activa */
  document.querySelectorAll('[data-ovista]').forEach(t => {
    t.onclick = () => {
      _ordersVistaActual = t.dataset.ovista;
      renderOrders();
    };
  });

  /* Nueva cita: manejado por event delegation global en app.js */

  /* Cards de cita */
  document.querySelectorAll('.order-card.cita').forEach(card => {
    card.onclick = () => {
      const id = card.dataset.pedido;
      if(id && typeof openOrderDetail === 'function') openOrderDetail(id);
    };
  });
}

/* ═══════════════════════════════════════════
   NUEVA CITA
   ═══════════════════════════════════════════ */
let _citaClienteId = null;
let _citaServicios = [];

function abrirNuevaCita(){
  if(document.querySelector('#m-nueva-cita')) return;

  _citaClienteId = null;
  _citaServicios = [];

  const hoy = todayISO();
  const horaActual = new Date().toTimeString().slice(0, 5);

  const h = `
    <div class="overlay" id="m-nueva-cita">
      <div class="sheet" style="position:relative">
        <div class="sheet-handle"></div>
        <button class="x" id="nc-close">✕</button>
        <h2>📅 Nueva cita</h2>
        <div class="sub">Agendá un servicio con tu cliente.</div>

        <label>Cliente <span style="color:var(--red);font-weight:900">*</span></label>
        <button type="button" class="cli-picker-display" id="nc-cli-btn">
          <span class="cli-picker-icon">👤</span>
          <span class="cli-picker-text" id="nc-cli-txt">Elegir cliente</span>
          <span class="cli-picker-chevron">▾</span>
        </button>

        <div class="row2">
          <div>
            <label>Fecha</label>
            <input id="nc-fecha" type="date" value="${hoy}">
          </div>
          <div>
            <label>Hora</label>
            <input id="nc-hora" type="time" value="${horaActual}">
          </div>
        </div>

        <label>Servicios</label>
        <div id="nc-servicios-list"></div>
        <button type="button" class="btn-ghost" id="nc-add-serv" style="margin-top:6px">➕ Agregar servicio</button>

        <div class="ped-totales" id="nc-totales" style="display:none"></div>

        <button class="btn-main" id="nc-save">✅ Crear cita</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', h);

  renderNcServicios();

  const cerrar = () => document.querySelector('#m-nueva-cita')?.remove();
  document.querySelector('#nc-close').onclick = cerrar;
  document.querySelector('#m-nueva-cita').onclick = e => {
    if(e.target.id === 'm-nueva-cita') cerrar();
  };

  document.querySelector('#nc-cli-btn').onclick = () => {
    if(typeof abrirSelectorClienteCita === 'function'){
      abrirSelectorClienteCita(id => {
        _citaClienteId = id;
        const cli = window.DB.clients.find(c => c.id === id);
        const txt = document.querySelector('#nc-cli-txt');
        if(txt && cli){
          txt.textContent = cli.nombre;
          txt.classList.add('asignado');
        }
      });
    } else if(typeof openNewOrder === 'function') {
      toast('⚠️ Selector no disponible');
    }
  };

  document.querySelector('#nc-add-serv').onclick = abrirPickerServicioCita;
  document.querySelector('#nc-save').onclick = guardarNuevaCita;
}

function renderNcServicios(){
  const cont = document.querySelector('#nc-servicios-list');
  if(!cont) return;

  if(!_citaServicios.length){
    cont.innerHTML = '<div style="text-align:center;color:var(--dim);font-size:12px;padding:14px">Sin servicios</div>';
    document.querySelector('#nc-totales').style.display = 'none';
    return;
  }

  cont.innerHTML = _citaServicios.map((item, i) => {
    const p = window.DB.products.find(x => x.id === item.productoId);
    const nombre = p ? p.nombre : 'Desconocido';
    const sub = item.cantidad * item.precioUnitario;
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${esc(nombre)}</div>
          <div class="cart-item-prices">
            <span>${item.cantidad} × ${fmt(item.precioUnitario)}</span>
            <span class="cart-item-subtotal">${fmt(sub)}</span>
          </div>
        </div>
        <button class="cart-item-del" data-ncdel="${i}" type="button">🗑️</button>
      </div>`;
  }).join('');

  cont.querySelectorAll('[data-ncdel]').forEach(btn => {
    btn.onclick = () => {
      _citaServicios.splice(+btn.dataset.ncdel, 1);
      renderNcServicios();
      updateNcTotales();
    };
  });

  updateNcTotales();
}

function updateNcTotales(){
  const cont = document.querySelector('#nc-totales');
  if(!cont) return;

  if(!_citaServicios.length){
    cont.style.display = 'none';
    return;
  }

  cont.style.display = 'block';
  const total = _citaServicios.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const ref = fmtRefOnly(total);

  cont.innerHTML = `
    <div class="ped-total-line"><span>Total</span><b>${fmt(total)}</b></div>
    ${ref ? `<div class="ped-ref">${ref}</div>` : ''}`;
}

function abrirPickerServicioCita(){
  if(document.querySelector('#m-cita-pick')) return;

  const servicios = (window.DB.products || []).filter(p => tipoDe(p) === 'servicio');

  if(!servicios.length){
    return toast('⚠️ No tenés servicios todavía');
  }

  const h = `
    <div class="overlay centered open" id="m-cita-pick" style="z-index:210">
      <div class="sheet" style="position:relative;max-width:420px">
        <button class="x" id="cp-close">✕</button>
        <h2>Elegir servicio</h2>
        <div class="picker-list">
          ${servicios.map(s => `
            <div class="picker-item" data-id="${s.id}">
              <div class="picker-info">
                <div class="picker-name">🔴 ${esc(s.nombre)}</div>
                <div class="picker-meta">${fmt(s.valorMargen || 0)}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', h);

  const cerrar = () => document.querySelector('#m-cita-pick')?.remove();
  document.querySelector('#cp-close').onclick = cerrar;
  document.querySelector('#m-cita-pick').onclick = e => {
    if(e.target.id === 'm-cita-pick') cerrar();
  };

  document.querySelectorAll('#m-cita-pick .picker-item').forEach(el => {
    el.onclick = () => {
      const id = el.dataset.id;
      const s = window.DB.products.find(x => x.id === id);
      cerrar();

      const c = calc(s);
      _citaServicios.push({
        productoId: s.id,
        cantidad: 1,
        precioUnitario: c.precioVenta
      });
      renderNcServicios();
    };
  });
}

function guardarNuevaCita(){
  if(!_citaClienteId){
    return toast('⚠️ Elegí un cliente');
  }
  if(!_citaServicios.length){
    return toast('⚠️ Agregá al menos un servicio');
  }

  const fecha = document.querySelector('#nc-fecha').value;
  const hora = document.querySelector('#nc-hora').value;

  if(!fecha) return toast('⚠️ Poné la fecha');
  if(!hora) return toast('⚠️ Poné la hora');

  const cliente = window.DB.clients.find(c => c.id === _citaClienteId);

  let total = 0;
  let ganancia = 0;

  const items = _citaServicios.map(item => {
    const p = window.DB.products.find(x => x.id === item.productoId);
    const c = calc(p);
    const sub = item.cantidad * item.precioUnitario;
    const ganItem = sub - (c.costoU * item.cantidad);

    total += sub;
    ganancia += ganItem;

    return {
      productoId: item.productoId,
      nombre: p.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      costoUnitario: c.costoU,
      tipo: 'servicio'
    };
  });

  const numero = generarNumeroPedido(fecha) + '-CITA';
  const tasaSnap = Number(window.DB.settings.tasaDia) || 0;
  const refSnap = window.DB.settings.refCurrency || null;

  const cita = {
    id: 'cita_' + uid(),
    tipo: 'cita',
    numero,
    fecha: fecha + 'T' + hora,
    fechaCita: fecha,
    horaCita: hora,
    clienteId: _citaClienteId,
    clienteNombre: cliente ? cliente.nombre : '',
    items,
    total,
    ganancia,
    estado: 'activo',
    pagado: false,
    completado: false,
    tasaSnapshot: tasaSnap > 0 ? tasaSnap : null,
    refCurrencySnapshot: tasaSnap > 0 ? refSnap : null
  };

  window.DB.orders.push(cita);
  saveDB();

  document.querySelector('#m-nueva-cita')?.remove();
  renderOrders();

  toast(`✅ Cita agendada para ${fecha.split('-').reverse().slice(0,2).join('/')} a las ${hora}`);
  if(navigator.vibrate) navigator.vibrate(20);
}

/* ═══════════════════════════════════════════
   Cambiar vista Orders (global para delegation)
   ═══════════════════════════════════════════ */
window.setOrdersVista = function(vista){
  _ordersVistaActual = vista;
  renderOrders();
};

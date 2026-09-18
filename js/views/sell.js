/* =========================================================
   views/sell.js — Venta rápida con selector de cliente
   ========================================================= */

let sellProductId = null;

/* =========================================================
   ABRIR MODAL DE VENTA RÁPIDA
   ========================================================= */
/* openSell DESACTIVADO — el flujo de venta ahora es por carrito */
function openSell(id){
  return toast('Usá el grid de productos');
}
function _openSellDesactivado(id){
  const p = window.DB.products.find(x => x.id === id);
  if(!p) return;

  const c = calc(p);
  if(c.stock <= 0) return toast('⚠️ Sin stock disponible');

  sellProductId = id;

  const titleEl = $('#sell-title');
  const subEl = $('#sell-sub');
  if(titleEl) titleEl.textContent = `Vender: ${p.nombre}`;
  if(subEl) subEl.textContent =
    `Stock disponible: ${c.stock} unidades · Precio sugerido: ${fmt(c.precioVenta)}`;

  $('#s-cant').value   = 1;
  $('#s-cant').max     = c.stock;
  $('#s-precio').value = c.precioVenta;
  $('#s-fecha').value  = todayISO();

  updateSellPreview();
  openModal('#m-sell');
}

/* =========================================================
   PREVIEW
   ========================================================= */
function updateSellPreview(){
  const p = window.DB.products.find(x => x.id === sellProductId);
  if(!p) return;

  const c    = calc(p);
  const cant = +$('#s-cant').value   || 0;
  const pr   = +$('#s-precio').value || 0;

  const costoVenta = calcularCostoFIFO(c.lotes, cant);

  const ingreso       = cant * pr;
  const gananciaVenta = ingreso - costoVenta;
  const saldoPost     = c.ingreso + ingreso - c.inversion;
  const stockPost     = Math.max(0, c.stock - cant);

  const colorGanancia = gananciaVenta >= 0 ? 'var(--green)' : 'var(--red)';
  const colorSaldo    = saldoPost     >= 0 ? 'var(--green)' : 'var(--red)';

  $('#s-preview').innerHTML = `
    <div class="line">
      <span>Ingreso de esta venta</span>
      <b>${fmtDual(ingreso)}</b>
    </div>
    <div class="line">
      <span>Costo real de esta venta</span>
      <b>${fmtDual(costoVenta)}</b>
    </div>
    <div class="line">
      <span>Ganancia de esta venta</span>
      <b style="color:${colorGanancia}">${fmtDual(gananciaVenta)}</b>
    </div>
    <div class="div"></div>
    <div class="line">
      <span>Stock restante</span>
      <b>${stockPost}</b>
    </div>
    <div class="line">
      <span>Saldo tras la venta</span>
      <b style="color:${colorSaldo}">${fmtDual(saldoPost)}</b>
    </div>`;
}

/* =========================================================
   PASO 1: preparar venta → abrir pop-up
   ========================================================= */
function prepararVenta(){
  const p = window.DB.products.find(x => x.id === sellProductId);
  if(!p) return;

  const c    = calc(p);
  const cant = +$('#s-cant').value   || 0;
  const pr   = +$('#s-precio').value || 0;

  if(cant <= 0)      return toast('⚠️ Cantidad inválida');
  if(cant > c.stock) return toast(`⚠️ Solo tienes ${c.stock} unidades`);
  if(pr < 0)         return toast('⚠️ Precio inválido');

  const costoVenta = calcularCostoFIFO(c.lotes, cant);
  const ingreso    = cant * pr;
  const ganancia   = ingreso - costoVenta;

  window.pendingSale = {
    tipo: 'single',
    items: [{
      productoId: p.id,
      nombre: p.nombre,
      cantidad: cant,
      precioUnitario: pr,
      costoUnitario: cant > 0 ? costoVenta / cant : 0,
      loteId: getLoteAsignado(c.lotes, cant),
      costoVenta
    }],
    total: ingreso,
    ganancia,
    fechaBase: $('#s-fecha').value || todayISO(),
    clienteId: null,
    efectivo: false
  };

  closeModal('#m-sell');
  setTimeout(() => openConfirmSale(), 150);
}

/* =========================================================
   POP-UP DE CONFIRMACIÓN
   ========================================================= */
function openConfirmSale(){
  const ps = window.pendingSale;
  if(!ps || !ps.items || !ps.items.length) return;

  const montoEl = $('#confirm-monto');
  const refEl   = $('#confirm-ref');
  const detEl   = $('#confirm-detalle');

  if(montoEl) montoEl.textContent = fmt(ps.total);
  if(refEl)   refEl.textContent   = fmtRefOnly(ps.total) || '';

  if(detEl){
    const detalle = ps.items.map(item => `
      <div class="line">
        <span>${esc(item.nombre)}</span>
        <b>${item.cantidad} × ${fmt(item.precioUnitario)}</b>
      </div>
    `).join('');

    const totalItems = ps.items.reduce((s, i) => s + i.cantidad, 0);

    detEl.innerHTML = `
      <div class="line" style="border-bottom:1px solid var(--line);
           padding-bottom:8px;margin-bottom:8px">
        <span>${ps.items.length} ${ps.items.length === 1 ? 'producto' : 'productos'}</span>
        <b>${totalItems} u</b>
      </div>
      ${detalle}
    `;
  }

  /* Reset del selector de cliente */
  resetConfirmCliente(ps.clienteId, null);

  /* Restaurar el check de efectivo */
  const efectivoCheck = document.querySelector('#confirm-efectivo');
  if(efectivoCheck) efectivoCheck.checked = ps.efectivo || false;

  /* Restaurar el check de pago móvil */
  const pmCheck = document.querySelector('#confirm-pago-movil');
  if(pmCheck) pmCheck.checked = ps.pagoMovil || false;

  actualizarQRPagoMovil();

  openModal('#m-confirm-sale');
}

function actualizarQRPagoMovil(){
  const wrap  = document.querySelector('#confirm-qr-wrap');
  const img   = document.querySelector('#confirm-qr-img');
  const hint  = document.querySelector('#confirm-qr-hint');
  const check = document.querySelector('#confirm-pago-movil');
  if(!wrap || !img || !check) return;

  if(!check.checked){
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';
  const qr = (window.DB.settings.business || {}).qrPagoMovil;

  if(qr){
    img.src = qr;
    img.style.display = 'block';
    if(hint) hint.style.display = 'none';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
    if(hint) hint.style.display = 'block';
  }
}

/* =========================================================
   PASO 2: confirmar y crear ticket
   ========================================================= */
function confirmarVenta(){
  const ps = window.pendingSale;
  if(!ps || !ps.items || !ps.items.length) return;

  const fechaBase = ps.fechaBase || todayISO();
  const numero = generarNumeroTicket(fechaBase);
  const hora = new Date().toTimeString().slice(0, 8);
  const fechaISO = `${fechaBase}T${hora}`;

  const ticketId = 't_' + uid();

  const tasaSnap = Number(window.DB.settings.tasaDia) || 0;
  const refSnap  = window.DB.settings.refCurrency || null;

  /* Resolver cliente */
  let clienteId = ps.clienteId || null;
  let clienteNombre = null;

  if(clienteId){
    const cli = (window.DB.clients || []).find(c => c.id === clienteId);
    if(cli) clienteNombre = cli.nombre;
  }

  /* Check efectivo */
  const efectivoCheck = document.querySelector('#confirm-efectivo');
  const efectivo = efectivoCheck ? efectivoCheck.checked : false;

  /* Check pago móvil */
  const pmCheck = document.querySelector('#confirm-pago-movil');
  const pagoMovil = pmCheck ? pmCheck.checked : false;

  /* Crear el ticket */
  const ticket = {
    id: ticketId,
    numero,
    fecha: fechaISO,
    clienteId: clienteId,
    clienteNombre: clienteNombre,
    items: ps.items.map(i => ({
      productoId: i.productoId,
      nombre: i.nombre,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
      costoUnitario: i.costoUnitario
    })),
    total: ps.total,
    ganancia: ps.ganancia,
    efectivo: efectivo,
    pagoMovil: pagoMovil,
    tasaSnapshot: tasaSnap > 0 ? tasaSnap : null,
    refCurrencySnapshot: tasaSnap > 0 ? refSnap : null
  };

  window.DB.tickets.push(ticket);

  /* Venta individual en cada producto */
  ps.items.forEach(item => {
    const p = window.DB.products.find(x => x.id === item.productoId);
    if(!p) return;

    p.ventas.push({
      id: uid(),
      ticketId,
      numero,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      costoUnitario: item.costoUnitario,
      loteId: item.loteId,
      fecha: fechaISO,
      tasaSnapshot: tasaSnap > 0 ? tasaSnap : null,
      refCurrencySnapshot: tasaSnap > 0 ? refSnap : null,
      cliente: clienteId
    });
  });

  saveDB();

  /* Limpiar carrito después de confirmar la venta del carrito */
  if(ps.tipo === 'cart'){
    if(typeof clearCarrito === 'function') clearCarrito();
    if(typeof updateCartFab === 'function') updateCartFab();
  }

  renderAll();

  /* Forzar actualización de badges en Vender */
  if(typeof actualizarTodosLosBadges === 'function') actualizarTodosLosBadges();

  closeModal('#m-confirm-sale');
  toast(`✅ Ticket ${numero} registrado`);

  window.pendingSale = null;
}

/* =========================================================
   VOLVER A EDITAR
   ========================================================= */
function volverAVenta(){
  const ps = window.pendingSale;
  if(!ps) return;

  closeModal('#m-confirm-sale');

  if(ps.tipo === 'single' && ps.items.length === 1){
    const item = ps.items[0];
    const id = item.productoId;
    const cant = item.cantidad;
    const precio = item.precioUnitario;
    const cliId = ps.clienteId;
    const efec = ps.efectivo;

    window.pendingSale = null;
    setTimeout(() => {
      openSell(id);
      setTimeout(() => {
        $('#s-cant').value = cant;
        $('#s-precio').value = precio;
        updateSellPreview();
        if(cliId || efec){
          if(!window.pendingSale) window.pendingSale = {};
          if(cliId) window.pendingSale.clienteId = cliId;
          if(efec)  window.pendingSale.efectivo = true;
        }
      }, 100);
    }, 150);
  } else {
    window.pendingSale = null;
    setTimeout(() => {
      if(typeof openCartModal === 'function') openCartModal();
    }, 150);
  }
}

/* =========================================================
   SELECTOR DE CLIENTE
   ========================================================= */
function resetConfirmCliente(clienteId, clienteNombre){
  if(!window.pendingSale) window.pendingSale = {};
  window.pendingSale.clienteId = clienteId || null;

  const picker = document.querySelector('#confirm-cli-picker');
  const text = document.querySelector('#confirm-cli-text');
  const search = document.querySelector('#confirm-cli-search');
  const form = document.querySelector('#confirm-cli-form');

  if(picker) picker.classList.remove('abierto');
  if(search) search.value = '';
  if(form) form.style.display = 'none';

  if(text){
    if(clienteId && clienteNombre){
      text.textContent = clienteNombre;
      text.classList.add('asignado');
    } else if(clienteId){
      const cli = (window.DB.clients || []).find(c => c.id === clienteId);
      if(cli){
        text.textContent = cli.nombre;
        text.classList.add('asignado');
      } else {
        text.textContent = 'Sin cliente asignado';
        text.classList.remove('asignado');
      }
    } else {
      text.textContent = 'Sin cliente asignado';
      text.classList.remove('asignado');
    }
  }

  renderConfirmClienteList();
}

function toggleConfirmClientePicker(){
  const picker = document.querySelector('#confirm-cli-picker');
  const form = document.querySelector('#confirm-cli-form');
  if(!picker) return;

  if(form) form.style.display = 'none';

  picker.classList.toggle('abierto');

  if(picker.classList.contains('abierto')){
    renderConfirmClienteList();
    const search = document.querySelector('#confirm-cli-search');
    if(search) setTimeout(() => search.focus(), 200);
  }
}

function renderConfirmClienteList(){
  const list = document.querySelector('#confirm-cli-list');
  const search = document.querySelector('#confirm-cli-search');
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

  let html = '';

  if(window.pendingSale && window.pendingSale.clienteId){
    html += `<div class="cli-picker-quitar" id="confirm-cli-quitar">
               ✕ Quitar cliente
             </div>`;
  }

  if(!clientes.length){
    html += `<div class="cli-picker-vacio">
               ${q ? 'Sin resultados' : 'Sin clientes guardados'}
             </div>`;
  } else {
    html += clientes.map(c => {
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
  }

  list.innerHTML = html;

  list.querySelectorAll('.cli-picker-item').forEach(el => {
    el.addEventListener('click', () => {
      seleccionarClienteConfirm(el.dataset.cli);
    });
  });

  const quitar = document.querySelector('#confirm-cli-quitar');
  if(quitar){
    quitar.addEventListener('click', quitarClienteConfirm);
  }
}

function seleccionarClienteConfirm(clienteId){
  const cli = (window.DB.clients || []).find(c => c.id === clienteId);
  if(!cli) return;

  if(!window.pendingSale) window.pendingSale = {};
  window.pendingSale.clienteId = clienteId;

  const text = document.querySelector('#confirm-cli-text');
  const picker = document.querySelector('#confirm-cli-picker');

  if(text){
    text.textContent = cli.nombre;
    text.classList.add('asignado');
  }
  if(picker) picker.classList.remove('abierto');

  if(navigator.vibrate) navigator.vibrate(10);
}

function quitarClienteConfirm(){
  if(window.pendingSale) window.pendingSale.clienteId = null;

  const text = document.querySelector('#confirm-cli-text');
  const picker = document.querySelector('#confirm-cli-picker');

  if(text){
    text.textContent = 'Sin cliente asignado';
    text.classList.remove('asignado');
  }
  if(picker) picker.classList.remove('abierto');
}

/* =========================================================
   FORMULARIO NUEVO CLIENTE
   ========================================================= */
function mostrarFormNuevoCliente(){
  const picker = document.querySelector('#confirm-cli-picker');
  const form = document.querySelector('#confirm-cli-form');
  if(!form) return;

  if(picker) picker.classList.remove('abierto');
  form.style.display = 'block';

  const n = document.querySelector('#confirm-nuevo-nombre');
  const c = document.querySelector('#confirm-nuevo-cedula');
  const t = document.querySelector('#confirm-nuevo-telefono');

  if(n) n.value = '';
  if(c) c.value = '';
  if(t) t.value = '';

  setTimeout(() => { if(n) n.focus(); }, 200);
}

function guardarNuevoClienteConfirm(){
  const n = document.querySelector('#confirm-nuevo-nombre');
  const c = document.querySelector('#confirm-nuevo-cedula');
  const t = document.querySelector('#confirm-nuevo-telefono');

  const nombre = n ? n.value.trim() : '';
  if(!nombre) return toast('⚠️ El nombre es obligatorio');

  const existente = (window.DB.clients || []).find(x =>
    normalize(x.nombre) === normalize(nombre)
  );

  let clienteId;

  if(existente){
    clienteId = existente.id;
    if(!existente.cedula && c && c.value.trim()) existente.cedula = c.value.trim();
    if(!existente.telefono && t && t.value.trim()) existente.telefono = t.value.trim();
  } else {
    const nuevo = {
      id: 'cli_' + uid(),
      nombre: nombre,
      cedula: c ? c.value.trim() : '',
      telefono: t ? t.value.trim() : '',
      notas: '',
      creado: Date.now()
    };
    if(!window.DB.clients) window.DB.clients = [];
    window.DB.clients.push(nuevo);
    clienteId = nuevo.id;
  }

  saveDB();

  if(!window.pendingSale) window.pendingSale = {};
  window.pendingSale.clienteId = clienteId;

  const text = document.querySelector('#confirm-cli-text');
  if(text){
    text.textContent = nombre;
    text.classList.add('asignado');
  }

  const form = document.querySelector('#confirm-cli-form');
  if(form) form.style.display = 'none';

  if(navigator.vibrate) navigator.vibrate(15);
  toast('✅ Cliente guardado');
}

function cancelarNuevoCliente(){
  const form = document.querySelector('#confirm-cli-form');
  if(form) form.style.display = 'none';
}

/* =========================================================
   INIT
   ========================================================= */
function initSell(){
  ['#s-cant', '#s-precio'].forEach(sel => {
    const el = $(sel);
    if(el) el.addEventListener('input', updateSellPreview);
  });

  const btnSave = $('#s-save');
  if(btnSave) btnSave.addEventListener('click', prepararVenta);

  const btnOk = $('#confirm-sale-ok');
  if(btnOk) btnOk.addEventListener('click', confirmarVenta);

  const btnBack = $('#confirm-sale-back');
  if(btnBack) btnBack.addEventListener('click', volverAVenta);

  /* Selector de cliente */
  const display = $('#confirm-cli-display');
  if(display) display.addEventListener('click', toggleConfirmClientePicker);

  const search = $('#confirm-cli-search');
  if(search) search.addEventListener('input', renderConfirmClienteList);

  const btnNuevo = $('#confirm-cli-nuevo');
  if(btnNuevo) btnNuevo.addEventListener('click', mostrarFormNuevoCliente);

  const btnGuardarNuevo = $('#confirm-nuevo-save');
  if(btnGuardarNuevo) btnGuardarNuevo.addEventListener('click', guardarNuevoClienteConfirm);

  const btnCancelarNuevo = $('#confirm-nuevo-cancel');
  if(btnCancelarNuevo) btnCancelarNuevo.addEventListener('click', cancelarNuevoCliente);

  /* Check efectivo: persistir en pendingSale */
  const efectivoCheck = $('#confirm-efectivo');
  if(efectivoCheck){
    efectivoCheck.addEventListener('change', () => {
      if(window.pendingSale) window.pendingSale.efectivo = efectivoCheck.checked;
    });
  }

  /* Check pago móvil: persistir + mostrar QR */
  const pmCheck = $('#confirm-pago-movil');
  if(pmCheck){
    pmCheck.addEventListener('change', () => {
      if(window.pendingSale) window.pendingSale.pagoMovil = pmCheck.checked;
      actualizarQRPagoMovil();
    });
  }
}

/* =========================================================
   HELPERS FIFO
   ========================================================= */
function calcularCostoFIFO(lotes, cant){
  if(cant <= 0 || !lotes.length) return 0;

  let restante = cant;
  let costoTotal = 0;

  for(const lote of lotes){
    if(restante <= 0) break;
    if(lote.unidadesRestantes <= 0) continue;

    const consumir = Math.min(restante, lote.unidadesRestantes);
    costoTotal += consumir * lote.costoUnitario;
    restante -= consumir;
  }

  return costoTotal;
}

function getLoteAsignado(lotes, cant){
  if(!lotes.length) return null;

  for(const lote of lotes){
    if(lote.unidadesRestantes > 0){
      return lote.id;
    }
  }

  return lotes[lotes.length - 1].id;
}
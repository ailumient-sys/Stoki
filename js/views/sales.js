/* =========================================================
   views/sales.js — Facturación
   Cada factura muestra miniaturas de sus items.
   ========================================================= */

function renderVentas(){
  const cont = $('#v-bill');
  if(!cont) return;

  const tickets = window.DB.tickets || [];

  const ventasSueltas = [];
  window.DB.products.forEach(p => {
    (p.ventas || []).forEach(v => {
      if(!v.ticketId){
        ventasSueltas.push({ ...v, producto: p });
      }
    });
  });

  const total = tickets.length + ventasSueltas.length;

  if(!total){
    cont.innerHTML = `
      <div class="empty">
        <div class="ico">🧾</div>
        <h3>Sin facturas</h3>
        <p>Cuando vendas algo aparecerá aquí,<br>agrupado por día.</p>
      </div>`;
    return;
  }

  const porDia = new Map();

  tickets.forEach(t => {
    const dia = t.fecha.slice(0, 10);
    if(!porDia.has(dia)) porDia.set(dia, { tickets: [], sueltas: [] });
    porDia.get(dia).tickets.push(t);
  });

  ventasSueltas.forEach(v => {
    const dia = v.fecha.slice(0, 10);
    if(!porDia.has(dia)) porDia.set(dia, { tickets: [], sueltas: [] });
    porDia.get(dia).sueltas.push(v);
  });

  const dias = [...porDia.entries()]
    .sort((a, b) => a[0] < b[0] ? 1 : -1);

  const resumen = buildResumen(tickets, ventasSueltas);

  cont.innerHTML = resumen + dias.map(([dia, data]) =>
    buildDayGroup(dia, data)
  ).join('');

  bindSalesEvents();
}

/* =========================================================
   RESUMEN
   ========================================================= */
function buildResumen(tickets, ventasSueltas){
  let unidades = 0, ingreso = 0, ganancia = 0;

  tickets.forEach(t => {
    t.items.forEach(i => unidades += (Number(i.cantidad) || 0));
    ingreso += t.total;
    ganancia += t.ganancia;
  });

  ventasSueltas.forEach(v => {
    const costoU = getCostoVentaSuelta(v);
    const cant   = Number(v.cantidad) || 0;
    const precio = Number(v.precioUnitario) || 0;
    unidades += cant;
    ingreso  += cant * precio;
    ganancia += (precio - costoU) * cant;
  });

  return `
    <div class="sales-summary">
      <div class="sales-summary-title">Resumen total</div>
      <div class="sales-summary-line">
        ${unidades} unidades · ${fmt(ingreso)}
      </div>
      <div class="sales-summary-ganancia">
        Ganancia acumulada: ${ganancia >= 0 ? '+' : ''}${fmt(ganancia)}
      </div>
    </div>`;
}

/* =========================================================
   GRUPO POR DÍA
   ========================================================= */
function buildDayGroup(dia, data){
  let unidades = 0, ingreso = 0, ganancia = 0;

  data.tickets.forEach(t => {
    t.items.forEach(i => unidades += (Number(i.cantidad) || 0));
    ingreso += t.total;
    ganancia += t.ganancia;
  });

  data.sueltas.forEach(v => {
    const costoU = getCostoVentaSuelta(v);
    const cant   = Number(v.cantidad) || 0;
    const precio = Number(v.precioUnitario) || 0;
    unidades += cant;
    ingreso  += cant * precio;
    ganancia += (precio - costoU) * cant;
  });

  const items = [
    ...data.tickets.map(t => ({ tipo:'ticket', fecha:t.fecha, data:t })),
    ...data.sueltas.map(v => ({ tipo:'suelta', fecha:v.fecha, data:v }))
  ].sort((a, b) => a.fecha < b.fecha ? 1 : -1);

  return `
    <div class="day-group">
      <div class="day-header">
        <div class="day-date">${labelDay(dia)}</div>
        <div class="day-summary">
          ${unidades} u · ${fmt(ingreso)} ·
          <span style="color:${ganancia >= 0 ? 'var(--green)' : 'var(--red)'}">
            ${ganancia >= 0 ? '+' : ''}${fmt(ganancia)}
          </span>
        </div>
      </div>
      ${items.map(i => i.tipo === 'ticket'
        ? billRowHTML(i.data)
        : ventaSueltaRowHTML(i.data)
      ).join('')}
    </div>`;
}

/* =========================================================
   FILA DE FACTURA (ticket con miniaturas)
   ========================================================= */
function billRowHTML(t){
  const hora = t.fecha.length > 11 ? t.fecha.slice(11, 16) : '';

  const MAX_VISIBLES = 4;
  const items = t.items || [];

  const thumbsHTML = items.slice(0, MAX_VISIBLES).map(item => {
    const p = window.DB.products.find(x => x.id === item.productoId);
    const foto = p ? getFotoPrincipal(p) : null;
    const inicial = esc((item.nombre || '?').charAt(0).toUpperCase());

    if(foto){
      return `<div class="bill-thumb" style="background-image:url('${foto}')"></div>`;
    }
    return `<div class="bill-thumb">${inicial}</div>`;
  }).join('');

  const masHTML = items.length > MAX_VISIBLES
    ? `<span class="bill-thumb-mas">+${items.length - MAX_VISIBLES}</span>`
    : '';

  let titulo;
  if(items.length === 1){
    titulo = esc(items[0].nombre);
  } else {
    titulo = `${esc(items[0].nombre)} +${items.length - 1} más`;
  }

  const totalItems = items.reduce((s, i) => s + i.cantidad, 0);

  const tasaSnap = t.tasaSnapshot || 0;
  const tieneTasa = tasaSnap > 0;

  const claseGanancia = t.ganancia >= 0 ? 'pos' : 'neg';

  /* Badge de efectivo en la hora */
  const efectivoTxt = t.efectivo ? ' · 💵' : '';

  return `
    <div class="bill-row" data-ticket="${t.id}">
      <div class="bill-head">
        <div class="bill-numero">${esc(t.numero)}</div>
        <div class="bill-hora">${hora}${efectivoTxt}</div>
        <button class="bill-del"
                data-del-ticket="${t.id}"
                aria-label="Cancelar factura">🗑️</button>
      </div>

      <div class="bill-thumbs">
        ${thumbsHTML}
        ${masHTML}
      </div>

      <div class="bill-info">
        <div class="bill-nombre">${titulo}</div>
        <div class="bill-meta">${totalItems} unidades</div>
      </div>

      <div class="bill-amount">
        <div>
          <div class="bill-total">${fmt(t.total)}</div>
          ${tieneTasa ? `<div class="bill-ref">${fmtRefOnly(t.total, tasaSnap)}</div>` : ''}
        </div>
        <div class="bill-ganancia ${claseGanancia}">
          ${t.ganancia >= 0 ? '+' : ''}${fmt(t.ganancia)}
        </div>
      </div>
    </div>`;
}

/* =========================================================
   FILA DE VENTA SUELTA (formato viejo)
   ========================================================= */
function ventaSueltaRowHTML(v){
  const p = v.producto;
  const costoU  = getCostoVentaSuelta(v);
  const cant    = Number(v.cantidad) || 0;
  const precio  = Number(v.precioUnitario) || 0;
  const ingreso = cant * precio;
  const ganancia = (precio - costoU) * cant;

  const hora = v.fecha.length > 11 ? v.fecha.slice(11, 16) : '';
  const numero = v.numero || '';

  const thumb = buildThumb(p, 40);

  const claseGanancia = ganancia >= 0 ? 'pos' : 'neg';

  /* Cantidad con unidad si es fraccionado */
  const t = tipoDe(p);
  const unidad = p.unidad || 'unidad';
  const esFrac = (t === 'producto' || t === 'material') && unidad !== 'unidad';
  const cantTxt = esFrac
    ? `${fmtCantidadUnidad(cant, unidad)} × ${fmt(precio)}/${unidadInfo(unidad).abreviacion}`
    : `${cant} × ${fmt(precio)}`;

  return `
    <div class="bill-row" data-detail="${p.id}">
      <div class="bill-head">
        <div class="bill-numero">${numero || '—'}</div>
        <div class="bill-hora">${hora}</div>
        <button class="bill-del"
                data-del-sale="${v.id}"
                data-prod-id="${p.id}"
                aria-label="Cancelar venta">🗑️</button>
      </div>

      <div class="bill-thumbs">
        ${thumb}
      </div>

      <div class="bill-info">
        <div class="bill-nombre">${esc(p.nombre)}</div>
        <div class="bill-meta">${cantTxt}</div>
      </div>

      <div class="bill-amount">
        <div>
          <div class="bill-total">${fmt(ingreso)}</div>
        </div>
        <div class="bill-ganancia ${claseGanancia}">
          ${ganancia >= 0 ? '+' : ''}${fmt(ganancia)}
        </div>
      </div>
    </div>`;
}

/* =========================================================
   HELPERS
   ========================================================= */
function getCostoVentaSuelta(v){
  if(typeof v.costoUnitario === 'number' && !isNaN(v.costoUnitario)){
    return v.costoUnitario;
  }
  const c = calc(v.producto);
  return c.costoU;
}

function labelDay(dia){
  const hoy  = todayISO();
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if(dia === hoy)  return 'Hoy';
  if(dia === ayer) return 'Ayer';

  const [y, m, d] = dia.split('-');
  return `${d}/${m}/${y}`;
}

/* =========================================================
   EVENTOS
   ========================================================= */
function bindSalesEvents(){
  document.querySelectorAll('[data-ticket]').forEach(row => {
    row.addEventListener('click', e => {
      if(e.target.closest('.bill-del')) return;
      if(typeof openTicket === 'function') openTicket(row.dataset.ticket);
    });
  });

  document.querySelectorAll('[data-del-ticket]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      cancelarTicket(btn.dataset.delTicket);
    });
  });

  document.querySelectorAll('[data-del-sale]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      cancelarVentaSuelta(btn.dataset.prodId, btn.dataset.delSale);
    });
  });
}

/* =========================================================
   CANCELAR TICKET
   ========================================================= */
async function cancelarTicket(ticketId){
  const t = window.DB.tickets.find(x => x.id === ticketId);
  if(!t) return;

  const mensaje =
    `${t.items.length} producto${t.items.length !== 1 ? 's' : ''}\n` +
    `Total: ${fmt(t.total)}\n\n` +
    `El stock se va a restaurar.`;

  const ok = await confirmarAccion({
    titulo: `¿Cancelar el ticket ${t.numero}?`,
    mensaje,
    botonOk: 'Cancelar ticket',
    botonCancel: 'Volver',
    colorOk: 'rojo'
  });

  if(!ok) return;

  t.items.forEach(item => {
    const p = window.DB.products.find(x => x.id === item.productoId);
    if(!p) return;
    p.ventas = (p.ventas || []).filter(v => v.ticketId !== ticketId);
  });

  window.DB.tickets = window.DB.tickets.filter(x => x.id !== ticketId);

  saveDB();
  renderAll();

  if(navigator.vibrate) navigator.vibrate(20);
  toast(`✅ Ticket ${t.numero} cancelado`);
}

/* =========================================================
   CANCELAR VENTA SUELTA
   ========================================================= */
async function cancelarVentaSuelta(productoId, ventaId){
  const p = window.DB.products.find(x => x.id === productoId);
  if(!p) return;

  const idx = (p.ventas || []).findIndex(v => v.id === ventaId);
  if(idx < 0) return;

  const v = p.ventas[idx];

  const titulo = v.numero ? `¿Cancelar venta ${v.numero}?` : '¿Cancelar esta venta?';
  const mensaje =
    `${v.cantidad} unidades a ${fmt(v.precioUnitario)}\n` +
    `El stock se va a restaurar.`;

  const ok = await confirmarAccion({
    titulo,
    mensaje,
    botonOk: 'Cancelar venta',
    botonCancel: 'Volver',
    colorOk: 'rojo'
  });

  if(!ok) return;

  p.ventas.splice(idx, 1);

  saveDB();
  renderAll();

  if(navigator.vibrate) navigator.vibrate(20);
  toast('✅ Venta cancelada');
}
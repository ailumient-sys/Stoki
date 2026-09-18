/* =========================================================
   views/cierre-diario.js — Cierre de caja del día
   ========================================================= */

function abrirCierreDiario(){
  if(document.querySelector('#m-cierre')) return;

  const hoy = todayISO();
  const ticketsHoy = (window.DB.tickets || []).filter(t => t.fecha.slice(0, 10) === hoy);

  let totalFacturado = 0;
  let gananciaTotal = 0;
  let efectivo = 0, debito = 0, pagoMovil = 0, otros = 0;
  let productosVendidos = {};
  let unidadesTotales = 0;

  ticketsHoy.forEach(t => {
    totalFacturado += t.total || 0;
    gananciaTotal += t.ganancia || 0;

    if(t.efectivo) efectivo += t.total || 0;
    else if(t.debito) debito += t.total || 0;
    else if(t.pagoMovil) pagoMovil += t.total || 0;
    else otros += t.total || 0;

    (t.items || []).forEach(it => {
      const k = it.nombre || '—';
      if(!productosVendidos[k]) productosVendidos[k] = 0;
      productosVendidos[k] += it.cantidad || 0;
      unidadesTotales += it.cantidad || 0;
    });
  });

  /* Stock restante actual */
  const stockRestante = (window.DB.products || [])
    .map(p => ({
      nombre: p.nombre,
      stock: calc(p).stock,
      unidad: p.unidadVenta || 'u'
    }))
    .filter(p => p.stock > 0)
    .sort((a, b) => a.stock - b.stock);

  /* Número del registro: fecha compacta YYYYMMDD */
  const numeroRegistro = hoy.replace(/-/g, '');

  const top5 = Object.entries(productosVendidos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const cierreGuardado = (window.DB.cierres || {})[hoy];

  const topHTML = top5.length
    ? top5.map(([nombre, cant], i) => `
        <div class="cierre-prod-row">
          <span class="cierre-prod-rank">${i + 1}</span>
          <span class="cierre-prod-nombre">${esc(nombre)}</span>
          <span class="cierre-prod-cant">${cant} u</span>
        </div>
      `).join('')
    : '<div style="text-align:center;color:var(--dim);font-size:12px;padding:14px">Sin ventas hoy todavía</div>';

  const html = `
    <div class="overlay centered open" id="m-cierre">
      <div class="sheet" style="position:relative;max-width:420px">
        <button class="x" id="cie-close">✕</button>
        <h2>📊 Cierre del día</h2>
        <div class="sub">${labelDay(hoy)} · ${ticketsHoy.length} factura${ticketsHoy.length !== 1 ? 's' : ''}</div>
        <div class="cierre-numero">Registro Nº ${numeroRegistro}</div>

        ${cierreGuardado ? `
          <div class="cierre-guardado">
            ✅ Cerrado a las ${new Date(cierreGuardado.cerradoEn).toLocaleTimeString('es-VE', {hour:'2-digit', minute:'2-digit'})}
          </div>
        ` : ''}

        <div class="cierre-total-box">
          <div class="cierre-label">Total facturado</div>
          <div class="cierre-total">${fmt(totalFacturado)}</div>
          <div class="cierre-ref">${fmtRefOnly(totalFacturado) || ''}</div>
        </div>

        <div class="cierre-kpis">
          <div class="cierre-kpi">
            <div class="cierre-kpi-label">Ganancia</div>
            <div class="cierre-kpi-valor" style="color:${gananciaTotal >= 0 ? 'var(--green)' : 'var(--red)'}">
              ${gananciaTotal >= 0 ? '+' : ''}${fmt(gananciaTotal)}
            </div>
          </div>
          <div class="cierre-kpi">
            <div class="cierre-kpi-label">Tickets</div>
            <div class="cierre-kpi-valor">${ticketsHoy.length}</div>
          </div>
        </div>

        <div class="cierre-metodos">
          <div class="cierre-metodo-row">
            <span>💵 Efectivo</span>
            <b>${fmt(efectivo)}</b>
          </div>
          <div class="cierre-metodo-row">
            <span>💳 Débito</span>
            <b>${fmt(debito)}</b>
          </div>
          <div class="cierre-metodo-row">
            <span>📱 Pago Móvil</span>
            <b>${fmt(pagoMovil)}</b>
          </div>
          ${otros > 0 ? `
          <div class="cierre-metodo-row">
            <span>📦 Otros</span>
            <b>${fmt(otros)}</b>
          </div>
          ` : ''}
        </div>

        <div class="cierre-top-title">🏆 Top 5 productos</div>
        <div class="cierre-top">${topHTML}</div>

        <div class="cierre-stock-box">
          <span>📦 Stock descontado</span>
          <b>${unidadesTotales} unidades</b>
        </div>

        <div class="cierre-top-title" style="margin-top:14px">
          📋 Stock restante (${stockRestante.length} producto${stockRestante.length !== 1 ? 's' : ''})
        </div>
        <div class="cierre-top">
          ${stockRestante.length ? stockRestante.slice(0, 10).map(p => `
            <div class="cierre-prod-row">
              <span class="cierre-prod-nombre">${esc(p.nombre)}</span>
              <span class="cierre-prod-cant" style="color:${p.stock <= 3 ? 'var(--red)' : p.stock <= 10 ? 'var(--amber)' : 'var(--dim)'}">
                ${p.stock} ${p.unidad}
              </span>
            </div>
          `).join('') : '<div style="text-align:center;color:var(--dim);font-size:12px;padding:14px">Sin productos en stock</div>'}
          ${stockRestante.length > 10 ? `
            <div style="text-align:center;color:var(--dim);font-size:11px;padding:6px">
              +${stockRestante.length - 10} más...
            </div>
          ` : ''}
        </div>

        <button class="btn-main" id="cie-guardar" style="margin-top:14px">
          ${cierreGuardado ? '🔄 Actualizar cierre' : '✅ Cerrar el día'}
        </button>

        <button class="btn-ghost" id="cie-exportar" style="margin-top:8px">
          📤 Exportar cierre
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const cerrar = () => {
    const el = document.querySelector('#m-cierre');
    if(el) el.remove();
  };

  document.querySelector('#cie-close').addEventListener('click', cerrar);
  document.querySelector('#m-cierre').addEventListener('click', e => {
    if(e.target.id === 'm-cierre') cerrar();
  });

  document.querySelector('#cie-guardar').addEventListener('click', () => {
    guardarCierreDiario(ticketsHoy);
    cerrar();
  });

  document.querySelector('#cie-exportar').addEventListener('click', () => {
    cerrar();
    setTimeout(() => abrirModalExportarCierre(), 150);
  });
}

function guardarCierreDiario(ticketsHoy){
  const hoy = todayISO();
  if(!window.DB.cierres) window.DB.cierres = {};

  let totalFacturado = 0, gananciaTotal = 0;
  let efectivo = 0, debito = 0, pagoMovil = 0;

  ticketsHoy.forEach(t => {
    totalFacturado += t.total || 0;
    gananciaTotal += t.ganancia || 0;
    if(t.efectivo) efectivo += t.total || 0;
    else if(t.debito) debito += t.total || 0;
    else if(t.pagoMovil) pagoMovil += t.total || 0;
  });

  /* Snapshot del stock al momento de cerrar */
  const stockSnapshot = (window.DB.products || []).map(p => ({
    nombre: p.nombre,
    stock: calc(p).stock,
    unidad: p.unidadVenta || 'u'
  })).filter(p => p.stock !== 0);

  window.DB.cierres[hoy] = {
    numero: hoy.replace(/-/g, ''),
    fecha: hoy,
    cerradoEn: new Date().toISOString(),
    tickets: ticketsHoy.length,
    totalFacturado,
    gananciaTotal,
    efectivo,
    debito,
    pagoMovil,
    stockSnapshot
  };

  saveDB();
  toast('✅ Día cerrado · ' + fmt(totalFacturado));
  if(navigator.vibrate) navigator.vibrate(20);
}

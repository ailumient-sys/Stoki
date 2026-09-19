/* cierres-historial.js — Historial de cierres + ver detalle */

function abrirCierresHistorial(){
  if(document.querySelector('#m-cierres-hist')) return;

  const cierres = window.DB.cierres || {};
  const fechas = Object.keys(cierres).sort().reverse();

  if(!fechas.length){
    return toast('⚠️ No hay cierres guardados');
  }

  /* Agrupar por mes */
  const porMes = {};
  fechas.forEach(f => {
    const mes = f.slice(0, 7); /* YYYY-MM */
    if(!porMes[mes]) porMes[mes] = [];
    porMes[mes].push(f);
  });

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const mesesHTML = Object.keys(porMes).sort().reverse().map(mes => {
    const [y, m] = mes.split('-');
    const nombreMes = `${MESES[+m - 1]} ${y}`;

    const filas = porMes[mes].map(f => {
      const c = cierres[f];
      const [yy, mm, dd] = f.split('-');
      const fecha = `${dd}/${mm}`;

      /* Calcular resultado con movimientos */
      const movsDelDia = (window.DB.movimientos || []).filter(mv =>
        mv.fecha && mv.fecha.slice(0, 10) === f
      );
      const netoMovs = movsDelDia.reduce((s, mv) => {
        return s + (mv.tipo === 'propina' ? mv.monto : -mv.monto);
      }, 0);
      const resultado = (c.totalFacturado || 0) + netoMovs;

      return `
        <div class="hist-cierre-row" data-fecha="${f}">
          <div class="hist-cierre-fecha">${fecha}</div>
          <div class="hist-cierre-info">
            <div class="hist-cierre-total">${fmt(c.totalFacturado || 0)}</div>
            <div class="hist-cierre-ganancia">Ganancia: +${fmt(c.gananciaTotal || 0)}</div>
          </div>
          <div class="hist-cierre-tickets">${c.tickets || 0} 🧾</div>
        </div>`;
    }).join('');

    return `
      <div class="hist-mes-grupo">
        <div class="hist-mes-titulo">${nombreMes}</div>
        ${filas}
      </div>`;
  }).join('');

  const html = `
    <div class="overlay" id="m-cierres-hist">
      <div class="sheet" style="position:relative">
        <div class="sheet-handle"></div>
        <button class="x" id="ch-close">✕</button>
        <h2>📚 Historial de cierres</h2>
        <div class="sub">Todos tus cierres guardados.</div>

        <div class="hist-cierres-list">${mesesHTML}</div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const cerrar = () => document.querySelector('#m-cierres-hist')?.remove();
  document.querySelector('#ch-close').onclick = cerrar;
  document.querySelector('#m-cierres-hist').onclick = e => {
    if(e.target.id === 'm-cierres-hist') cerrar();
  };

  /* Tap en un cierre → ver detalle */
  document.querySelectorAll('.hist-cierre-row').forEach(row => {
    row.onclick = () => {
      cerrar();
      setTimeout(() => abrirCierreDeFecha(row.dataset.fecha), 150);
    };
  });
}

/* ═══════════════════════════════════════════
   VER CIERRE DE UNA FECHA (modo lectura)
   ═══════════════════════════════════════════ */
function abrirCierreDeFecha(fechaISO){
  if(document.querySelector('#m-cierre')) return;

  const cierre = (window.DB.cierres || {})[fechaISO];
  if(!cierre) return toast('⚠️ Cierre no encontrado');

  const ticketsHoy = (window.DB.tickets || []).filter(t => t.fecha.slice(0, 10) === fechaISO);
  const [y, m, d] = fechaISO.split('-');
  const fechaLabel = `${d}/${m}/${y}`;

  /* Productos vendidos */
  const productosVendidos = {};
  let unidadesTotales = 0;
  ticketsHoy.forEach(t => {
    (t.items || []).forEach(it => {
      const k = it.nombre || '—';
      if(!productosVendidos[k]) productosVendidos[k] = 0;
      productosVendidos[k] += it.cantidad || 0;
      unidadesTotales += it.cantidad || 0;
    });
  });

  const top5 = Object.entries(productosVendidos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topHTML = top5.length
    ? top5.map(([nombre, cant], i) => `
        <div class="cierre-prod-row">
          <span class="cierre-prod-rank">${i + 1}</span>
          <span class="cierre-prod-nombre">${esc(nombre)}</span>
          <span class="cierre-prod-cant">${cant} u</span>
        </div>
      `).join('')
    : '<div style="text-align:center;color:var(--dim);font-size:12px;padding:14px">Sin datos</div>';

  /* Movimientos */
  const movsDia = (window.DB.movimientos || []).filter(mv =>
    mv.fecha && mv.fecha.slice(0, 10) === fechaISO
  );
  const totalPropinas = movsDia.filter(x => x.tipo === 'propina').reduce((s, x) => s + x.monto, 0);
  const totalMermas = movsDia.filter(x => x.tipo === 'merma').reduce((s, x) => s + x.monto, 0);
  const netoMovs = totalPropinas - totalMermas;
  const resultadoFinal = (cierre.totalFacturado || 0) + netoMovs;

  /* Stock snapshot del cierre */
  const stockSnap = cierre.stockSnapshot || [];

  const stockHTML = stockSnap.length
    ? stockSnap.slice(0, 10).map(s => `
        <div class="cierre-prod-row">
          <span class="cierre-prod-nombre">${esc(s.nombre)}</span>
          <span class="cierre-prod-cant" style="color:${s.stock <= 3 ? 'var(--red)' : s.stock <= 10 ? 'var(--amber)' : 'var(--dim)'}">
            ${s.stock} ${s.unidad || 'u'}
          </span>
        </div>
      `).join('')
    : '<div style="text-align:center;color:var(--dim);font-size:12px;padding:14px">Sin datos</div>';

  const html = `
    <div class="overlay centered open" id="m-cierre">
      <div class="sheet" style="position:relative;max-width:420px">
        <button class="x" id="cie-close">✕</button>
        <h2>📊 Cierre del ${fechaLabel}</h2>
        <div class="sub">${cierre.tickets || 0} factura${cierre.tickets !== 1 ? 's' : ''}</div>
        <div class="cierre-numero">Registro Nº ${cierre.numero || fechaISO.replace(/-/g, '')}</div>

        ${cierre.cerradoEn ? `
          <div class="cierre-guardado">
            ✅ Cerrado a las ${new Date(cierre.cerradoEn).toLocaleTimeString('es-VE', {hour:'2-digit', minute:'2-digit'})}
          </div>
        ` : ''}

        <div class="cierre-total-box">
          <div class="cierre-label">Total facturado</div>
          <div class="cierre-total">${fmt(cierre.totalFacturado || 0)}</div>
          <div class="cierre-ref">${fmtRefOnly(cierre.totalFacturado || 0) || ''}</div>
        </div>

        <div class="cierre-kpis">
          <div class="cierre-kpi">
            <div class="cierre-kpi-label">Ganancia</div>
            <div class="cierre-kpi-valor" style="color:${(cierre.gananciaTotal || 0) >= 0 ? 'var(--green)' : 'var(--red)'}">
              ${(cierre.gananciaTotal || 0) >= 0 ? '+' : ''}${fmt(cierre.gananciaTotal || 0)}
            </div>
          </div>
          <div class="cierre-kpi">
            <div class="cierre-kpi-label">Tickets</div>
            <div class="cierre-kpi-valor">${cierre.tickets || 0}</div>
          </div>
        </div>

        <div class="cierre-metodos">
          <div class="cierre-metodo-row"><span>💵 Efectivo</span><b>${fmt(cierre.efectivo || 0)}</b></div>
          <div class="cierre-metodo-row"><span>💳 Débito</span><b>${fmt(cierre.debito || 0)}</b></div>
          <div class="cierre-metodo-row"><span>📱 Pago Móvil</span><b>${fmt(cierre.pagoMovil || 0)}</b></div>
        </div>

        ${movsDia.length ? `
          <div class="cierre-metodos" style="margin-top:12px">
            <div class="cierre-metodo-row" style="font-weight:900;color:var(--dim);text-transform:uppercase;font-size:10px;letter-spacing:.5px">
              <span>Movimientos</span><span></span>
            </div>
            ${totalPropinas > 0 ? `<div class="cierre-metodo-row"><span>💰 Propinas</span><b style="color:var(--green)">+${fmt(totalPropinas)}</b></div>` : ''}
            ${totalMermas > 0 ? `<div class="cierre-metodo-row"><span>⚠️ Mermas</span><b style="color:var(--red)">−${fmt(totalMermas)}</b></div>` : ''}
            <div class="cierre-metodo-row" style="border-top:1px solid var(--line);margin-top:4px;padding-top:8px">
              <span><b>Resultado</b></span>
              <b style="color:var(--green)">${fmt(resultadoFinal)}</b>
            </div>
          </div>
        ` : ''}

        <div class="cierre-top-title">🏆 Top 5 productos</div>
        <div class="cierre-top">${topHTML}</div>

        <div class="cierre-top-title" style="margin-top:14px">📦 Stock al cierre</div>
        <div class="cierre-top">${stockHTML}</div>

        <button class="btn-ghost" id="cie-reexportar" style="margin-top:14px">
          📤 Exportar de nuevo
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const cerrar = () => document.querySelector('#m-cierre')?.remove();
  document.querySelector('#cie-close').onclick = cerrar;
  document.querySelector('#m-cierre').onclick = e => {
    if(e.target.id === 'm-cierre') cerrar();
  };

  /* Re-exportar */
  document.querySelector('#cie-reexportar').onclick = () => {
    cerrar();
    setTimeout(() => {
      if(typeof abrirModalExportarCierre === 'function'){
        /* Cambiar temporalmente el "hoy" a la fecha del cierre */
        const _hoyReal = todayISO;
        window.todayISO = () => fechaISO;

        abrirModalExportarCierre();

        /* Restaurar después */
        setTimeout(() => {
          window.todayISO = _hoyReal;
        }, 500);
      }
    }, 150);
  };
}

/* ═══════════════════════════════════════════
   MINI-MODAL SELECTOR (Cierre del día / Historial)
   ═══════════════════════════════════════════ */
function abrirModalCierreSelector(){
  if(document.querySelector('#m-cierre-selector')) return;

  const cierres = window.DB.cierres || {};
  const hayCierres = Object.keys(cierres).length > 0;

  const html = `
    <div class="overlay fab-menu-overlay open" id="m-cierre-selector">
      <div class="fab-menu" style="padding-bottom:20px">
        <button class="fab-menu-option" id="cs-hoy" type="button">
          <span class="fab-menu-icon" style="background:rgba(34,197,94,.15)">📊</span>
          <span class="fab-menu-text">
            <span class="fab-menu-title">Cerrar el día de hoy</span>
            <span class="fab-menu-sub">Ver resumen y cerrar</span>
          </span>
        </button>

        ${hayCierres ? `
        <button class="fab-menu-option" id="cs-historial" type="button">
          <span class="fab-menu-icon" style="background:rgba(59,130,246,.15)">📚</span>
          <span class="fab-menu-text">
            <span class="fab-menu-title">Ver cierres anteriores</span>
            <span class="fab-menu-sub">Historial completo</span>
          </span>
        </button>
        ` : ''}

        <button class="fab-menu-cancel" id="cs-cerrar" type="button">Cerrar</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const cerrar = () => document.querySelector('#m-cierre-selector')?.remove();

  document.querySelector('#cs-cerrar').onclick = cerrar;
  document.querySelector('#m-cierre-selector').onclick = e => {
    if(e.target.id === 'm-cierre-selector') cerrar();
  };

  document.querySelector('#cs-hoy').onclick = () => {
    cerrar();
    setTimeout(() => {
      if(typeof abrirCierreDiario === 'function') abrirCierreDiario();
    }, 150);
  };

  const btnHist = document.querySelector('#cs-historial');
  if(btnHist){
    btnHist.onclick = () => {
      cerrar();
      setTimeout(() => {
        if(typeof abrirCierresHistorial === 'function') abrirCierresHistorial();
      }, 150);
    };
  }
}

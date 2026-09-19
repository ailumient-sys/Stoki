/* =========================================================
   views/stats-page.js — Pestaña Estadísticas completa
   Períodos: Diario / Semanal / Mensual / Anual
   Gráficos: unidades, ingresos, ganancia
   Top 10 por unidades + Top 10 por ganancia
   + Capital vs Recuperado
   ========================================================= */

let statsPagePeriodo = 'diario';
let statsPageFiltroTipo = 'todo';

/* =========================================================
   RENDER PRINCIPAL
   ========================================================= */
function renderStatsPage(){
  const cont = document.querySelector('#v-stats');
  if(!cont) return;

  const todasLasVentas = statsPageGetVentas();
  const hayProductos = (window.DB.products || []).length > 0;

  /* Sin nada todavía */
  if(!todasLasVentas.length && !hayProductos){
    cont.innerHTML = statsPageEmptyHTML();
    return;
  }

  /* Hay productos pero sin ventas */
  if(!todasLasVentas.length){
    const capital = statsPageCapital();
    cont.innerHTML = `
      <div class="empty" style="padding:40px 20px 20px">
        <div class="ico">📈</div>
        <h3>Sin ventas todavía</h3>
        <p>Registrá tu primera venta para ver<br>gráficos y estadísticas.</p>
      </div>
      ${statsPageCapitalHTML(capital)}
    `;
    return;
  }

  /* Todo normal */
  const agrupado   = statsPageAgrupar(todasLasVentas, statsPagePeriodo);
  const labels     = agrupado.map(g => labelOf(g.key, statsPagePeriodo));
  const unidades   = agrupado.map(g => g.unidades);
  const ingresos   = agrupado.map(g => g.ingreso);
  const ganancias  = agrupado.map(g => g.ganancia);

  const kpis       = statsPageKpis(todasLasVentas);
  const topU       = statsPageTopProductos(todasLasVentas, 'unidades', 10);
  const topG       = statsPageTopProductos(todasLasVentas, 'ganancia', 10);
  const capital    = statsPageCapital();

  cont.innerHTML = statsPageHTML(labels, kpis, topU, topG, capital);

  /* Dibujar gráficos cuando el canvas ya tenga tamaño */
  setTimeout(() => {
    drawBars(document.querySelector('#st-ch-unidades'),  labels, unidades,  '#3b82f6');
    drawBars(document.querySelector('#st-ch-ingresos'), labels, ingresos,  '#22c55e');
    drawBars(document.querySelector('#st-ch-ganancia'), labels, ganancias, '#a855f7');
  }, 60);

  statsPageBindEvents();
}

/* =========================================================
   OBTENER TODAS LAS VENTAS (tickets + sueltas)
   ========================================================= */
function statsPageGetVentas(){
  const ventas = [];
  const filtro = (typeof statsPageFiltroTipo !== 'undefined') ? statsPageFiltroTipo : 'todo';

  /* Helper: ¿pasa el filtro? */
  const pasa = (productoId) => {
    if(filtro === 'todo') return true;
    const prod = window.DB.products.find(x => x.id === productoId);
    if(!prod) return filtro === 'producto';
    return tipoDe(prod) === filtro;
  };

  /* Tickets */
  (window.DB.tickets || []).forEach(t => {
    (t.items || []).forEach(item => {
      if(!pasa(item.productoId)) return;

      const cant   = Number(item.cantidad) || 0;
      const precio = Number(item.precioUnitario) || 0;
      const costoU = Number(item.costoUnitario) || 0;

      ventas.push({
        fecha: t.fecha,
        productoId: item.productoId,
        nombre: item.nombre,
        cantidad: cant,
        ingreso: cant * precio,
        ganancia: cant * (precio - costoU)
      });
    });
  });

  /* Ventas sueltas (formato viejo) */
  (window.DB.products || []).forEach(p => {
    if(!pasa(p.id)) return;

    (p.ventas || []).forEach(v => {
      if(v.ticketId) return;

      const cant   = Number(v.cantidad) || 0;
      const precio = Number(v.precioUnitario) || 0;
      const costoU = (typeof v.costoUnitario === 'number' && !isNaN(v.costoUnitario))
        ? v.costoUnitario
        : calc(p).costoU;

      ventas.push({
        fecha: v.fecha,
        productoId: p.id,
        nombre: p.nombre,
        cantidad: cant,
        ingreso: cant * precio,
        ganancia: cant * (precio - costoU)
      });
    });
  });

  return ventas;
}

/* =========================================================
   AGRUPAR POR PERÍODO
   ========================================================= */
function statsPageAgrupar(ventas, modo){
  const map = new Map();

  ventas.forEach(v => {
    const key = periodKey(v.fecha, modo);
    if(!map.has(key)){
      map.set(key, { key, unidades: 0, ingreso: 0, ganancia: 0 });
    }
    const g = map.get(key);
    g.unidades += v.cantidad;
    g.ingreso  += v.ingreso;
    g.ganancia += v.ganancia;
  });

  const lista = [...map.values()].sort((a, b) => a.key < b.key ? -1 : 1);

  /* Cantidad de puntos según modo */
  const LIMITES = { diario: 14, semanal: 12, mensual: 12, anual: 5 };
  const limite = LIMITES[modo] || 14;

  return lista.slice(-limite);
}

/* =========================================================
   KPIs GLOBALES
   ========================================================= */
function statsPageKpis(ventas){
  let unidades = 0, ingreso = 0, ganancia = 0;

  ventas.forEach(v => {
    unidades += v.cantidad;
    ingreso  += v.ingreso;
    ganancia += v.ganancia;
  });

  const margen = ingreso > 0 ? (ganancia / ingreso) * 100 : 0;

  return { unidades, ingreso, ganancia, margen };
}

/* =========================================================
   TOP PRODUCTOS
   ========================================================= */
function statsPageTopProductos(ventas, criterio, limite){
  const map = new Map();

  ventas.forEach(v => {
    const key = v.productoId;
    if(!map.has(key)){
      map.set(key, {
        productoId: key,
        nombre: v.nombre,
        unidades: 0,
        ingreso: 0,
        ganancia: 0
      });
    }
    const g = map.get(key);
    g.unidades += v.cantidad;
    g.ingreso  += v.ingreso;
    g.ganancia += v.ganancia;
  });

  const lista = [...map.values()];
  lista.sort((a, b) => b[criterio] - a[criterio]);

  return lista.slice(0, limite);
}

/* =========================================================
   CAPITAL VS RECUPERADO
   ========================================================= */
function statsPageCapital(){
  let inversion = 0;

  (window.DB.products || []).forEach(p => {
    (p.lotes || []).forEach(l => {
      inversion += Number(l.costoTotalCompra) || 0;
    });
  });

  const ventas = statsPageGetVentas();
  let recuperado = 0;
  ventas.forEach(v => recuperado += v.ingreso);

  const gananciaNeta = recuperado - inversion;
  const porcentaje = inversion > 0
    ? Math.min(100, (recuperado / inversion) * 100)
    : 0;

  return { inversion, recuperado, gananciaNeta, porcentaje };
}

/* =========================================================
   HTML PRINCIPAL
   ========================================================= */
function statsPageHTML(labels, kpis, topU, topG, capital){
  return `
    <style>
      .st-progress{
        height:14px;background:var(--bg3);border-radius:10px;
        overflow:hidden;margin:8px 6px 0;
      }
      .st-progress-bar{
        height:100%;border-radius:10px;
        transition:width .5s cubic-bezier(.4,0,.2,1);
      }
      .st-top-row{
        display:flex;align-items:center;gap:10px;
        padding:9px 10px;background:var(--bg3);
        border-radius:10px;margin-bottom:6px;
      }
      .st-top-rank{
        width:24px;height:24px;border-radius:50%;
        background:var(--bg4);color:var(--dim);
        font-size:11px;font-weight:900;
        display:flex;align-items:center;justify-content:center;
        flex:0 0 auto;
      }
      .st-top-rank.gold{background:#fbbf24;color:#1a1000}
      .st-top-rank.silver{background:#cbd5e1;color:#1a1000}
      .st-top-rank.bronze{background:#d97706;color:#fff}
      .st-top-info{flex:1;min-width:0}
      .st-top-name{
        font-size:13px;font-weight:800;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        margin-bottom:2px;
      }
      .st-top-meta{font-size:11px;color:var(--dim);font-weight:600}
      .st-top-value{
        font-size:13px;font-weight:900;
        font-variant-numeric:tabular-nums;
        flex:0 0 auto;text-align:right;
      }
    </style>

    <div class="inv-tabs" style="margin-bottom:10px">
      <button class="inv-tab ${statsPageFiltroTipo==='todo'?'active':''}" data-sttipo="todo" type="button">Todo</button>
      <button class="inv-tab ${statsPageFiltroTipo==='producto'?'active':''}" data-sttipo="producto" type="button">🟢</button>
      <button class="inv-tab ${statsPageFiltroTipo==='material'?'active':''}" data-sttipo="material" type="button">🔵</button>
      <button class="inv-tab ${statsPageFiltroTipo==='receta'?'active':''}" data-sttipo="receta" type="button">🟣</button>
      <button class="inv-tab ${statsPageFiltroTipo==='servicio'?'active':''}" data-sttipo="servicio" type="button">🔴</button>
    </div>

    <div class="period" id="st-period">
      <button data-p="diario"  class="${statsPagePeriodo === 'diario'  ? 'active' : ''}">Diario</button>
      <button data-p="semanal" class="${statsPagePeriodo === 'semanal' ? 'active' : ''}">Semanal</button>
      <button data-p="mensual" class="${statsPagePeriodo === 'mensual' ? 'active' : ''}">Mensual</button>
      <button data-p="anual"   class="${statsPagePeriodo === 'anual'   ? 'active' : ''}">Anual</button>
    </div>

    <div class="kpis">
      <div class="kbox">
        <div class="k">Unidades</div>
        <div class="v">${kpis.unidades}</div>
      </div>
      <div class="kbox">
        <div class="k">Ingresos</div>
        <div class="v" style="color:var(--green)">${fmt(kpis.ingreso)}</div>
      </div>
      <div class="kbox">
        <div class="k">Ganancia</div>
        <div class="v" style="color:${kpis.ganancia >= 0 ? 'var(--green)' : 'var(--red)'}">
          ${kpis.ganancia >= 0 ? '+' : ''}${fmt(kpis.ganancia)}
        </div>
      </div>
      <div class="kbox">
        <div class="k">Margen</div>
        <div class="v">${kpis.margen.toFixed(0)}%</div>
      </div>
    </div>

    <div class="chart-box">
      <div class="chart-title">📦 Unidades vendidas</div>
      <canvas id="st-ch-unidades"></canvas>
    </div>

    <div class="chart-box">
      <div class="chart-title">💵 Ingresos</div>
      <canvas id="st-ch-ingresos"></canvas>
    </div>

    <div class="chart-box">
      <div class="chart-title">📈 Ganancia</div>
      <canvas id="st-ch-ganancia"></canvas>
    </div>

    ${statsPageCapitalHTML(capital)}
    ${statsPageRentabilidadPorTipo()}
    ${statsPageTopHTML('🏆 Top 10 por unidades', topU, 'unidades')}
    ${statsPageTopHTML('💰 Top 10 por ganancia', topG, 'ganancia')}
  `;
}

/* =========================================================
   HTML — CAPITAL
   ========================================================= */
function statsPageCapitalHTML(c){
  const enRojo = c.recuperado < c.inversion;
  const color  = enRojo ? 'var(--red)' : 'var(--green)';
  const grad   = enRojo
    ? 'linear-gradient(90deg,var(--red),#b91c1c)'
    : 'linear-gradient(90deg,var(--green),#16a34a)';

  const estado = enRojo
    ? `Faltan ${fmt(c.inversion - c.recuperado)} para recuperar`
    : `Recuperaste y llevás +${fmt(c.gananciaNeta)}`;

  return `
    <div class="chart-box">
      <div class="chart-title">🎯 Capital vs Recuperado</div>

      <div style="display:flex;justify-content:space-between;
                  align-items:baseline;margin:0 6px 4px">
        <span style="font-size:12px;color:var(--dim);font-weight:700">
          Inversión total
        </span>
        <span style="font-size:14px;font-weight:900;
                     font-variant-numeric:tabular-nums">
          ${fmt(c.inversion)}
        </span>
      </div>

      <div style="display:flex;justify-content:space-between;
                  align-items:baseline;margin:0 6px 6px">
        <span style="font-size:12px;color:var(--dim);font-weight:700">
          Recuperado
        </span>
        <span style="font-size:14px;font-weight:900;color:${color};
                     font-variant-numeric:tabular-nums">
          ${fmt(c.recuperado)}
        </span>
      </div>

      <div class="st-progress">
        <div class="st-progress-bar"
             style="width:${c.porcentaje.toFixed(1)}%;background:${grad}">
        </div>
      </div>

      <div style="text-align:center;font-size:12px;
                  font-weight:800;color:${color};margin-top:10px">
        ${estado}
      </div>
    </div>`;
}

/* =========================================================
   HTML — TOP PRODUCTOS
   ========================================================= */
function statsPageTopHTML(titulo, items, criterio){
  if(!items.length){
    return `
      <div class="chart-box">
        <div class="chart-title">${titulo}</div>
        <div style="text-align:center;color:var(--dim);
                    font-size:12px;padding:14px">
          Sin datos suficientes
        </div>
      </div>`;
  }

  const filas = items.map((item, idx) => {
    const p = (window.DB.products || []).find(x => x.id === item.productoId);
    const thumb = p ? buildThumb(p, 36) : '';

    const rankClass = idx === 0 ? 'gold'
                    : idx === 1 ? 'silver'
                    : idx === 2 ? 'bronze'
                    : '';

    let valor, meta, color;

    if(criterio === 'unidades'){
      valor = `${item.unidades} u`;
      meta  = `Ingreso: ${fmt(item.ingreso)}`;
      color = 'var(--txt)';
    } else {
      valor = `${item.ganancia >= 0 ? '+' : ''}${fmt(item.ganancia)}`;
      meta  = `${item.unidades} u · ${fmt(item.ingreso)}`;
      color = item.ganancia >= 0 ? 'var(--green)' : 'var(--red)';
    }

    return `
      <div class="st-top-row">
        <div class="st-top-rank ${rankClass}">${idx + 1}</div>
        ${thumb}
        <div class="st-top-info">
          <div class="st-top-name">${esc(item.nombre)}</div>
          <div class="st-top-meta">${meta}</div>
        </div>
        <div class="st-top-value" style="color:${color}">${valor}</div>
      </div>`;
  }).join('');

  return `
    <div class="chart-box">
      <div class="chart-title">${titulo}</div>
      ${filas}
    </div>`;
}

/* =========================================================
   EMPTY STATE
   ========================================================= */
function statsPageEmptyHTML(){
  return `
    <div class="empty">
      <div class="ico">📈</div>
      <h3>Sin estadísticas todavía</h3>
      <p>Agregá productos y registrá ventas<br>para ver gráficos, ganancias<br>y productos más rentables.</p>
    </div>`;
}

/* =========================================================
   EVENTOS
   ========================================================= */
function statsPageBindEvents(){
  /* Tabs por tipo */
  document.querySelectorAll('[data-sttipo]').forEach(tab => {
    tab.onclick = () => {
      statsPageFiltroTipo = tab.dataset.sttipo;
      renderStatsPage();
      if(navigator.vibrate) navigator.vibrate(10);
    };
  });

  /* Periodo */
  const period = document.querySelector('#st-period');
  if(!period) return;

  period.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if(!btn) return;
    statsPagePeriodo = btn.dataset.p;
    renderStatsPage();
  });
}

/* ═══════════════════════════════════════════
   RENTABILIDAD POR TIPO (siempre muestra los 4)
   ═══════════════════════════════════════════ */
function statsPageRentabilidadPorTipo(){
  const ventas = [];
  const acum = { producto: 0, material: 0, receta: 0, servicio: 0 };

  /* Tickets */
  (window.DB.tickets || []).forEach(t => {
    (t.items || []).forEach(item => {
      const prod = window.DB.products.find(x => x.id === item.productoId);
      const tipo = prod ? tipoDe(prod) : 'producto';

      const cant = Number(item.cantidad) || 0;
      const precio = Number(item.precioUnitario) || 0;
      const costoU = Number(item.costoUnitario) || 0;
      const ganancia = cant * (precio - costoU);

      if(acum[tipo] !== undefined) acum[tipo] += ganancia;
    });
  });

  /* Ventas sueltas */
  (window.DB.products || []).forEach(p => {
    const tipo = tipoDe(p);
    (p.ventas || []).forEach(v => {
      if(v.ticketId) return;

      const cant = Number(v.cantidad) || 0;
      const precio = Number(v.precioUnitario) || 0;
      const costoU = (typeof v.costoUnitario === 'number' && !isNaN(v.costoUnitario))
        ? v.costoUnitario
        : calc(p).costoU;

      if(acum[tipo] !== undefined) acum[tipo] += cant * (precio - costoU);
    });
  });

  const total = Object.values(acum).reduce((s, v) => s + Math.max(0, v), 0);

  const filas = [
    { tipo: 'producto', emoji: '🟢', nombre: 'Productos', valor: acum.producto },
    { tipo: 'material', emoji: '🔵', nombre: 'Materiales', valor: acum.material },
    { tipo: 'receta',   emoji: '🟣', nombre: 'Recetas',   valor: acum.receta },
    { tipo: 'servicio', emoji: '🔴', nombre: 'Servicios', valor: acum.servicio }
  ];

  const filasHTML = filas.map(f => {
    const pct = total > 0 ? (Math.max(0, f.valor) / total) * 100 : 0;
    return `
      <div class="rpt-row">
        <div class="rpt-info">
          <div class="rpt-nombre">${f.emoji} ${f.nombre}</div>
          <div class="rpt-barra">
            <div class="rpt-barra-fill" style="width:${pct}%;background:${TIPOS_INFO[f.tipo].color}"></div>
          </div>
        </div>
        <div class="rpt-valor">
          <b style="color:${f.valor >= 0 ? 'var(--green)' : 'var(--red)'}">
            ${f.valor >= 0 ? '+' : ''}${fmt(f.valor)}
          </b>
          <span>${pct.toFixed(0)}%</span>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="chart-box">
      <div class="chart-title">💡 Rentabilidad por tipo</div>
      ${filasHTML}
    </div>`;
}


/* Exponer setter para event delegation global */
window.setStatsPageFiltro = function(tipo){
  statsPageFiltroTipo = tipo;
  if(typeof renderStatsPage === 'function') renderStatsPage();
};

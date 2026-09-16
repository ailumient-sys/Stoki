/* =========================================================
   views/stats.js — modal "¿Cuánto he vendido?"
   Usa el costoUnitario snapshot de cada venta.
   ========================================================= */

let statsId   = null;
let statsMode = 'diario';

/* ---------- Abrir modal ---------- */
function openStats(id){
  statsId   = id;
  statsMode = 'diario';

  renderStats();
  openModal('#m-stats');
}

/* ---------- Costo snapshot de una venta ---------- */
function getCostoVentaStats(v, producto){
  if(typeof v.costoUnitario === 'number' && !isNaN(v.costoUnitario)){
    return v.costoUnitario;
  }
  return calc(producto).costoU;
}

/* ---------- Render principal ---------- */
function renderStats(){
  const p = window.DB.products.find(x => x.id === statsId);
  if(!p) return;

  const c      = calc(p);
  const ventas = p.ventas || [];

  /* Agrupar por periodo */
  const grupos = agruparVentas(ventas, statsMode, p);
  const labels = grupos.map(g => labelOf(g.key, statsMode));

  /* Acumulado para la gráfica de punto de equilibrio */
  let acc = 0;
  const acumulado = grupos.map(g => (acc += g.ing));

  /* Armar HTML */
  $('#stats-body').innerHTML = buildStatsHTML(p, c, grupos);

  /* Listener del selector de periodo */
  $('#period-sel').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if(!btn) return;

    statsMode = btn.dataset.m;
    renderStats();
  });

  /* Dibujar gráficas */
  if(grupos.length > 0){
    requestAnimationFrame(() => requestAnimationFrame(() => {
      drawBars($('#ch-units'), labels, grupos.map(g => g.cant), '#3b82f6');
      drawBars($('#ch-inc'),   labels, grupos.map(g => g.ing),  '#22c55e');
      drawBreakEven($('#ch-break'), labels, acumulado, c.inversion);
    }));
  }
}

/* ---------- Agrupación de ventas ---------- */
function agruparVentas(ventas, modo, producto){
  const map = new Map();

  ventas.forEach(v => {
    const key = periodKey(v.fecha, modo);
    const cant = Number(v.cantidad) || 0;
    const precio = Number(v.precioUnitario) || 0;
    const costoU = getCostoVentaStats(v, producto);

    if(!map.has(key)){
      map.set(key, { key, cant: 0, ing: 0, gan: 0 });
    }

    const g = map.get(key);
    g.cant += cant;
    g.ing  += cant * precio;
    g.gan  += (precio - costoU) * cant;
  });

  return [...map.values()].sort((a, b) => a.key < b.key ? -1 : 1);
}

/* ---------- HTML del modal ---------- */
function buildStatsHTML(p, c, grupos){
  return `
    <h2 style="margin:0 0 4px">Estadísticas</h2>
    <div class="sub">${esc(p.nombre)}</div>

    ${buildStatsKPIs(c)}
    ${buildPeriodSelector()}
    ${grupos.length === 0 ? buildStatsEmpty() : buildStatsContent(p, c, grupos)}
  `;
}

/* ---------- Bloque de KPIs ---------- */
function buildStatsKPIs(c){
  return `
    <div class="kpis">
      <div class="kbox">
        <div class="k">Total vendido</div>
        <div class="v">${c.uVend} u.</div>
      </div>
      <div class="kbox">
        <div class="k">Ingresos</div>
        <div class="v">${fmt(c.ingreso)}</div>
      </div>
      <div class="kbox">
        <div class="k">Ganancia real</div>
        <div class="v" style="color:${c.gananciaReal >= 0 ? 'var(--green)' : 'var(--red)'}">
          ${fmt(c.gananciaReal)}
        </div>
      </div>
      <div class="kbox">
        <div class="k">Saldo vs inversión</div>
        <div class="v" style="color:${c.saldo >= 0 ? 'var(--green)' : 'var(--red)'}">
          ${fmt(c.saldo)}
        </div>
      </div>
    </div>`;
}

/* ---------- Selector de periodo ---------- */
function buildPeriodSelector(){
  const modos = ['diario', 'semanal', 'mensual', 'anual'];

  return `
    <div class="period" id="period-sel">
      ${modos.map(m => {
        const label = m.charAt(0).toUpperCase() + m.slice(1);
        const active = m === statsMode ? 'active' : '';
        return `<button data-m="${m}" class="${active}">${label}</button>`;
      }).join('')}
    </div>`;
}

/* ---------- Estado vacío ---------- */
function buildStatsEmpty(){
  return `
    <div class="empty" style="padding:30px 10px">
      <div class="ico">📉</div>
      <h3>Sin ventas registradas</h3>
      <p>Registra una venta para ver las gráficas.</p>
    </div>`;
}

/* ---------- Contenido: gráficas + historial ---------- */
function buildStatsContent(p, c, grupos){
  const ventas = p.ventas || [];

  return `
    <div class="chart-box">
      <div class="chart-title">Unidades vendidas</div>
      <canvas id="ch-units"></canvas>
    </div>

    <div class="chart-box">
      <div class="chart-title">Recuperación de la inversión</div>
      <canvas id="ch-break"></canvas>
      <div class="legend">
        <span><i style="background:var(--green)"></i>Ingreso acumulado</span>
        <span><i style="background:var(--red)"></i>Inversión total</span>
      </div>
    </div>

    <div class="chart-box">
      <div class="chart-title">Ingreso por periodo</div>
      <canvas id="ch-inc"></canvas>
    </div>

    <div class="chart-title" style="margin-top:18px">Historial de ventas</div>
    ${buildSalesTable(ventas, p)}
  `;
}

/* ---------- Tabla de historial ---------- */
function buildSalesTable(ventas, producto){
  const ordenadas = [...ventas].sort((a, b) =>
    a.fecha < b.fecha ? 1 : -1
  );

  const filas = ordenadas.map(v => {
    const cantidad = Number(v.cantidad) || 0;
    const precio   = Number(v.precioUnitario) || 0;
    const ingreso  = cantidad * precio;
    const costoU   = getCostoVentaStats(v, producto);
    const ganancia = (precio - costoU) * cantidad;
    const color    = ganancia >= 0 ? 'var(--green)' : 'var(--red)';

    return `
      <tr>
        <td>${v.fecha.slice(0, 10)}</td>
        <td class="r">${cantidad}</td>
        <td class="r">${fmtShort(precio)}</td>
        <td class="r">${fmtShort(ingreso)}</td>
        <td class="r" style="color:${color}">
          ${ganancia >= 0 ? '+' : ''}${fmtShort(ganancia)}
        </td>
      </tr>`;
  }).join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th class="r">Cant.</th>
          <th class="r">P. unit</th>
          <th class="r">Ingreso</th>
          <th class="r">Ganancia</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>`;
}
/* =========================================================
   views/cierre-pdf.js — Libro contable real + exportación
   ========================================================= */

function abrirModalExportarCierre(){
  if(document.querySelector('#m-cie-export')) return;

  const html = `
    <div class="overlay centered open" id="m-cie-export">
      <div class="sheet" style="position:relative;max-width:440px">
        <button class="x" id="ciexp-close">✕</button>
        <h2>📤 Exportar cierre</h2>
        <div class="sub">Elegí el formato y qué incluir.</div>

        <div class="exp-section">
          <div class="exp-section-title">Formato</div>
          <div class="exp-toggle-row" id="ciexp-modo">
            <button class="exp-modo-btn active" data-modo="simple">
              <span class="exp-modo-icon">📄</span>
              <span class="exp-modo-titulo">Resumen</span>
              <span class="exp-modo-sub">1 hoja</span>
            </button>
            <button class="exp-modo-btn" data-modo="libro">
              <span class="exp-modo-icon">📚</span>
              <span class="exp-modo-titulo">Libro contable</span>
              <span class="exp-modo-sub">Formal + firma</span>
            </button>
          </div>
        </div>

        <div class="exp-section">
          <div class="exp-section-title">Incluir</div>

          <label class="ciexp-check">
            <input type="checkbox" id="ciexp-total" checked>
            <span>💰 Totales del día</span>
          </label>

          <label class="ciexp-check">
            <input type="checkbox" id="ciexp-metodos" checked>
            <span>💳 Desglose por método</span>
          </label>

          <label class="ciexp-check">
            <input type="checkbox" id="ciexp-productos" checked>
            <span>📦 Productos vendidos</span>
          </label>

          <label class="ciexp-check">
            <input type="checkbox" id="ciexp-stockrestante" checked>
            <span>📋 Stock restante</span>
          </label>

          <label class="ciexp-check">
            <input type="checkbox" id="ciexp-movimientos">
            <span>🧾 Lista de movimientos (facturas)</span>
          </label>

          <label class="ciexp-check">
            <input type="checkbox" id="ciexp-firma" checked>
            <span>✍️ Línea para firma</span>
          </label>
        </div>

        <button class="btn-main" id="ciexp-generar">
          📄 Generar PDF
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const cerrar = () => {
    const el = document.querySelector('#m-cie-export');
    if(el) el.remove();
  };

  document.querySelector('#ciexp-close').addEventListener('click', cerrar);
  document.querySelector('#m-cie-export').addEventListener('click', e => {
    if(e.target.id === 'm-cie-export') cerrar();
  });

  document.querySelectorAll('#ciexp-modo .exp-modo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ciexp-modo .exp-modo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const modo = btn.dataset.modo;
      if(modo === 'libro'){
        document.querySelector('#ciexp-firma').checked = true;
        document.querySelector('#ciexp-movimientos').checked = true;
      }
    });
  });

  document.querySelector('#ciexp-generar').addEventListener('click', () => {
    const modo = document.querySelector('#ciexp-modo .exp-modo-btn.active').dataset.modo;
    const incluir = {
      total: document.querySelector('#ciexp-total').checked,
      metodos: document.querySelector('#ciexp-metodos').checked,
      productos: document.querySelector('#ciexp-productos').checked,
      stockRestante: document.querySelector('#ciexp-stockrestante').checked,
      movimientos: document.querySelector('#ciexp-movimientos').checked,
      firma: document.querySelector('#ciexp-firma').checked
    };

    cerrar();
    setTimeout(() => generarPDFCierre(modo, incluir), 150);
  });
}

/* =========================================================
   GENERADOR DE PDF — Libro contable
   ========================================================= */

async function generarPDFCierre(modo, incluir){
  if(typeof window.jspdf === 'undefined'){
    toast('⚠️ Generador PDF no cargado');
    return;
  }

  const hoy = todayISO();
  const ticketsHoy = (window.DB.tickets || []).filter(t => t.fecha.slice(0, 10) === hoy);

  if(!ticketsHoy.length){
    toast('⚠️ No hay ventas hoy');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15;

  const VERDE = [34, 197, 94];
  const NEGRO = [26, 26, 26];
  const GRIS  = [120, 120, 120];
  const GRIS2 = [245, 246, 248];
  const BLANCO= [255, 255, 255];
  const ROJO  = [239, 68, 68];
  const AMBER = [245, 158, 11];

  /* ── Cálculos ── */
  let totalFacturado = 0, gananciaTotal = 0;
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

  /* Movimientos del día */
  const hoyISO = new Date().toISOString().slice(0, 10);
  const movsHoy = (window.DB.movimientos || []).filter(m =>
    m.fecha && m.fecha.slice(0, 10) === hoyISO
  );
  const totalPropinas = movsHoy.filter(m => m.tipo === 'propina').reduce((s, m) => s + m.monto, 0);
  const totalMermas = movsHoy.filter(m => m.tipo === 'merma').reduce((s, m) => s + m.monto, 0);
  const netoMovs = totalPropinas - totalMermas;
  const resultadoDia = totalFacturado + netoMovs;

  /* Stock restante actual */
  const stockRestante = (window.DB.products || [])
    .map(p => ({
      nombre: p.nombre,
      stock: calc(p).stock,
      unidad: p.unidadVenta || 'u'
    }))
    .filter(p => p.stock !== 0)
    .sort((a, b) => a.stock - b.stock);

  const numeroRegistro = hoy.replace(/-/g, '');
  const negocio = window.DB.settings.business || {};
  const nombreNegocio = negocio.nombre || 'Mi negocio';
  const rifNegocio = negocio.rif || '';
  const telNegocio = negocio.telefono || '';
  const dirNegocio = negocio.direccion || '';

  const fecha = new Date().toLocaleDateString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  /* ═══════════════════════════════════════════════════════
     HEADER
     ═══════════════════════════════════════════════════════ */
  doc.setFillColor(...VERDE);
  doc.rect(0, 0, W, 24, 'F');

  doc.setTextColor(...BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Stoki', M, 12);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(modo === 'libro' ? 'Libro de caja diario' : 'Cierre del día', W - M, 12, { align: 'right' });

  doc.setFontSize(9);
  doc.text(`Nº ${numeroRegistro}`, W - M, 18, { align: 'right' });

  /* Info del negocio */
  doc.setTextColor(...NEGRO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(nombreNegocio, M, 34);

  let ySub = 38;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);

  if(rifNegocio){
    doc.text('RIF: ' + rifNegocio, M, ySub);
    ySub += 4;
  }
  if(telNegocio){
    doc.text('Tel: ' + telNegocio, M, ySub);
    ySub += 4;
  }
  if(dirNegocio){
    doc.text(dirNegocio, M, ySub);
    ySub += 4;
  }

  doc.setTextColor(...NEGRO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(fecha, W - M, 34, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(`${ticketsHoy.length} factura${ticketsHoy.length !== 1 ? 's' : ''}`, W - M, 38, { align: 'right' });

  let y = Math.max(ySub, 46) + 4;

  /* ═══════════════════════════════════════════════════════
     TOTALES DEL DÍA
     ═══════════════════════════════════════════════════════ */
  if(incluir.total){
    doc.setFillColor(...GRIS2);
    doc.roundedRect(M, y, W - 2 * M, 24, 3, 3, 'F');

    doc.setTextColor(...GRIS);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TOTAL FACTURADO', M + 6, y + 7);

    doc.setTextColor(...VERDE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(fmt(totalFacturado), M + 6, y + 18);

    doc.setTextColor(...GRIS);
    doc.setFontSize(8);
    doc.text('GANANCIA', W - M - 6, y + 7, { align: 'right' });

    doc.setTextColor(...(gananciaTotal >= 0 ? VERDE : ROJO));
    doc.setFontSize(14);
    doc.text((gananciaTotal >= 0 ? '+' : '') + fmt(gananciaTotal), W - M - 6, y + 18, { align: 'right' });

    y += 30;
  }

  /* ═══════════════════════════════════════════════════════
     MOVIMIENTOS (solo libro)
     ═══════════════════════════════════════════════════════ */
  if(incluir.movimientos){
    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Movimientos del día', M, y);
    y += 6;

    /* Header tabla */
    doc.setFillColor(...VERDE);
    doc.rect(M, y, W - 2 * M, 7, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('HORA', M + 3, y + 4.5);
    doc.text('COMPROBANTE', M + 22, y + 4.5);
    doc.text('CLIENTE', M + 55, y + 4.5);
    doc.text('MÉTODO', M + 105, y + 4.5);
    doc.text('MONTO', W - M - 3, y + 4.5, { align: 'right' });
    y += 7;

    const ordenados = [...ticketsHoy].sort((a, b) => a.fecha < b.fecha ? -1 : 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    ordenados.forEach((t, i) => {
      if(y > H - 30){
        doc.addPage();
        y = 20;
      }

      if(i % 2 === 0){
        doc.setFillColor(250, 250, 250);
        doc.rect(M, y, W - 2 * M, 6, 'F');
      }

      const hora = t.fecha.slice(11, 16);
      doc.setTextColor(...NEGRO);
      doc.text(hora, M + 3, y + 4);

      doc.text((t.numero || '').slice(0, 14), M + 22, y + 4);

      const cliente = (t.clienteNombre || '—').slice(0, 22);
      doc.text(cliente, M + 55, y + 4);

      let metodo = 'Otro';
      if(t.efectivo) metodo = 'Efectivo';
      else if(t.debito) metodo = 'Débito';
      else if(t.pagoMovil) metodo = 'P. Móvil';

      doc.setTextColor(...GRIS);
      doc.text(metodo, M + 105, y + 4);

      doc.setTextColor(...NEGRO);
      doc.setFont('helvetica', 'bold');
      doc.text(fmt(t.total), W - M - 3, y + 4, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      y += 6;
    });

    y += 4;
  }

  /* ═══════════════════════════════════════════════════════
     RESUMEN POR MÉTODO
     ═══════════════════════════════════════════════════════ */
  if(incluir.metodos){
    if(y > H - 60){
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Resumen por método de pago', M, y);
    y += 8;

    const metodos = [
      ['Efectivo', efectivo],
      ['Débito', debito],
      ['Pago Móvil', pagoMovil],
      ['Otros', otros]
    ].filter(([_, monto]) => monto > 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    metodos.forEach(([label, monto]) => {
      doc.setTextColor(...NEGRO);
      doc.text(label, M + 3, y);

      doc.setTextColor(...GRIS);
      doc.text('..............', M + 30, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NEGRO);
      doc.text(fmt(monto), W - M - 3, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      y += 6;
    });

    /* Línea y total */
    doc.setDrawColor(...VERDE);
    doc.setLineWidth(0.4);
    doc.line(M, y, W - M, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NEGRO);
    doc.text('TOTAL', M + 3, y);
    doc.setTextColor(...VERDE);
    doc.setFontSize(13);
    doc.text(fmt(totalFacturado), W - M - 3, y, { align: 'right' });

    y += 12;
  }

  /* ═══════════════════════════════════════════════════════
     MOVIMIENTOS DEL DÍA
     ═══════════════════════════════════════════════════════ */
  if(movsHoy.length){
    if(y > H - 60){
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Movimientos del día', M, y);
    y += 6;

    movsHoy.forEach(m => {
      if(y > H - 30){
        doc.addPage();
        y = 20;
      }

      const signo = m.tipo === 'propina' ? '+' : '-';
      const color = m.tipo === 'propina' ? VERDE : ROJO;

      doc.setTextColor(...NEGRO);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      let desc = m.descripcion || m.tipo;
      if(m.tipo === 'merma' && m.itemNombre){
        desc = `${m.itemNombre} — ${desc}`;
      }
      if(m.tipo === 'merma' && m.cantidad){
        const u = m.unidad || 'u';
        desc = `${fmtCantidadUnidad(m.cantidad, u)} · ${desc}`;
      }
      doc.text(`• ${desc.slice(0, 60)}`, M + 3, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...color);
      doc.text(`${signo}${fmt(m.monto)}`, W - M - 3, y, { align: 'right' });

      y += 5;
    });

    /* Total movimientos */
    y += 2;
    doc.setDrawColor(...VERDE);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NEGRO);
    doc.text('Neto movimientos', M + 3, y);

    const colorNeto = netoMovs >= 0 ? VERDE : ROJO;
    doc.setTextColor(...colorNeto);
    doc.text(`${netoMovs >= 0 ? '+' : ''}${fmt(netoMovs)}`, W - M - 3, y, { align: 'right' });

    y += 12;

    /* Resultado final del día */
    doc.setFillColor(...GRIS2);
    doc.roundedRect(M, y, W - 2 * M, 18, 3, 3, 'F');

    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RESULTADO DEL DÍA', M + 6, y + 7);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIS);
    doc.text(`Facturado: ${fmt(totalFacturado)}`, M + 6, y + 13);
    doc.text(`Movimientos: ${netoMovs >= 0 ? '+' : ''}${fmt(netoMovs)}`, M + 90, y + 13);

    doc.setTextColor(...VERDE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(fmt(resultadoDia), W - M - 6, y + 12, { align: 'right' });

    y += 24;
  }

  /* ═══════════════════════════════════════════════════════
     ANÁLISIS DEL DÍA
     ═══════════════════════════════════════════════════════ */
  if(incluir.productos){
    if(y > H - 80){
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Análisis del día', M, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const ticketPromedio = ticketsHoy.length > 0 ? totalFacturado / ticketsHoy.length : 0;
    const margenPct = totalFacturado > 0 ? (gananciaTotal / totalFacturado) * 100 : 0;

    const metricas = [
      ['Tickets emitidos', String(ticketsHoy.length)],
      ['Unidades vendidas', String(unidadesTotales)],
      ['Ticket promedio', fmt(ticketPromedio)],
      ['Margen sobre ventas', margenPct.toFixed(1) + '%']
    ];

    metricas.forEach(([label, valor]) => {
      doc.setTextColor(...GRIS);
      doc.text(label, M + 3, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NEGRO);
      doc.text(valor, W - M - 3, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 6;
    });

    y += 4;

    /* Productos vendidos */
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NEGRO);
    doc.setFontSize(10);
    doc.text('Productos vendidos', M, y);
    y += 6;

    const lista = Object.entries(productosVendidos).sort((a, b) => b[1] - a[1]);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    lista.forEach(([nombre, cant]) => {
      if(y > H - 30){
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(...NEGRO);
      const nc = nombre.length > 55 ? nombre.slice(0, 55) + '…' : nombre;
      doc.text('· ' + nc, M + 3, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GRIS);
      doc.text(cant + ' u', W - M - 3, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      y += 5;
    });

    y += 4;
  }

  /* ═══════════════════════════════════════════════════════
     STOCK RESTANTE
     ═══════════════════════════════════════════════════════ */
  if(incluir.stockRestante && stockRestante.length){
    if(y > H - 60){
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Inventario restante', M, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    stockRestante.forEach(p => {
      if(y > H - 20){
        doc.addPage();
        y = 20;
      }

      const esBajo = p.stock <= 3;
      const esMedio = p.stock > 3 && p.stock <= 10;

      doc.setTextColor(...(esBajo ? ROJO : esMedio ? AMBER : NEGRO));
      const nc = p.nombre.length > 50 ? p.nombre.slice(0, 50) + '…' : p.nombre;
      doc.text('· ' + nc, M + 3, y);

      doc.setFont('helvetica', 'bold');
      doc.text(p.stock + ' ' + p.unidad, W - M - 3, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      y += 5;
    });

    y += 4;
  }

  /* ═══════════════════════════════════════════════════════
     FIRMA
     ═══════════════════════════════════════════════════════ */
  if(incluir.firma){
    if(y > H - 50){
      doc.addPage();
      y = 20;
    }

    y += 8;

    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.3);
    doc.line(M + 20, y + 18, W - M - 20, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text('Firma del responsable', W / 2, y + 24, { align: 'center' });

    y += 30;
  }

  /* ═══════════════════════════════════════════════════════
     FOOTER en cada página
     ═══════════════════════════════════════════════════════ */
  const totalPags = doc.internal.getNumberOfPages();
  for(let i = 1; i <= totalPags; i++){
    doc.setPage(i);
    doc.setDrawColor(...VERDE);
    doc.setLineWidth(0.3);
    doc.line(M, H - 12, W - M, H - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text('Generado con Stoki · Registro Nº ' + numeroRegistro, M, H - 6);
    doc.text('Página ' + i + ' de ' + totalPags, W - M, H - 6, { align: 'right' });
  }

  const nombreArchivo = `Cierre-${numeroRegistro}.pdf`;
  previsualizarPDF(doc, nombreArchivo, 'Cierre');

  if(navigator.vibrate) navigator.vibrate(20);
}

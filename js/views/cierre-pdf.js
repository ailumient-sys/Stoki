/* =========================================================
   views/cierre-pdf.js — Exportación del cierre diario
   ========================================================= */

function abrirModalExportarCierre(){
  if(document.querySelector('#m-cie-export')) return;

  const html = `
    <div class="overlay centered open" id="m-cie-export">
      <div class="sheet" style="position:relative;max-width:420px">
        <button class="x" id="ciexp-close">✕</button>
        <h2>📤 Exportar cierre</h2>
        <div class="sub">Elegí qué querés incluir.</div>

        <div class="exp-section">
          <div class="exp-section-title">Modo</div>
          <div class="exp-toggle-row" id="ciexp-modo">
            <button class="exp-modo-btn active" data-modo="simple">
              <span class="exp-modo-icon">📄</span>
              <span class="exp-modo-titulo">Simple</span>
              <span class="exp-modo-sub">Resumen general</span>
            </button>
            <button class="exp-modo-btn" data-modo="avanzado">
              <span class="exp-modo-icon">📚</span>
              <span class="exp-modo-titulo">Avanzado</span>
              <span class="exp-modo-sub">Con facturas</span>
            </button>
          </div>
        </div>

        <div class="exp-section">
          <div class="exp-section-title">Incluir</div>

          <label class="ciexp-check">
            <input type="checkbox" id="ciexp-total" checked>
            <span>💰 Total facturado</span>
          </label>

          <label class="ciexp-check">
            <input type="checkbox" id="ciexp-metodos" checked>
            <span>💳 Desglose por método de pago</span>
          </label>

          <label class="ciexp-check">
            <input type="checkbox" id="ciexp-productos" checked>
            <span>📦 Productos vendidos</span>
          </label>

          <label class="ciexp-check">
            <input type="checkbox" id="ciexp-stock" checked>
            <span>📉 Stock descontado total</span>
          </label>

          <label class="ciexp-check" id="ciexp-check-facturas" style="opacity:.4;pointer-events:none">
            <input type="checkbox" id="ciexp-facturas" disabled>
            <span>🧾 Facturas individuales (solo avanzado)</span>
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
      const wrap = document.querySelector('#ciexp-check-facturas');
      const input = document.querySelector('#ciexp-facturas');

      if(modo === 'avanzado'){
        wrap.style.opacity = '1';
        wrap.style.pointerEvents = 'auto';
        input.disabled = false;
        input.checked = true;
      } else {
        wrap.style.opacity = '.4';
        wrap.style.pointerEvents = 'none';
        input.disabled = true;
        input.checked = false;
      }
    });
  });

  document.querySelector('#ciexp-generar').addEventListener('click', () => {
    const modo = document.querySelector('#ciexp-modo .exp-modo-btn.active').dataset.modo;
    const incluir = {
      total: document.querySelector('#ciexp-total').checked,
      metodos: document.querySelector('#ciexp-metodos').checked,
      productos: document.querySelector('#ciexp-productos').checked,
      stock: document.querySelector('#ciexp-stock').checked,
      facturas: document.querySelector('#ciexp-facturas').checked
    };

    cerrar();
    setTimeout(() => generarPDFCierre(modo, incluir), 150);
  });
}

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
  const GRIS  = [130, 130, 130];
  const GRIS2 = [245, 246, 248];
  const BLANCO= [255, 255, 255];
  const ROJO  = [239, 68, 68];

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

  /* HEADER */
  doc.setFillColor(...VERDE);
  doc.rect(0, 0, W, 22, 'F');
  doc.setTextColor(...BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Stoki', M, 14);
  doc.setFontSize(14);
  doc.text('Cierre del día', W - M, 14, { align: 'right' });

  doc.setTextColor(...NEGRO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const negocio = (window.DB.settings.business || {}).nombre || 'Mi negocio';
  doc.text(negocio, M, 32);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  doc.setFontSize(9);
  const fecha = new Date().toLocaleDateString('es-VE', {day:'2-digit', month:'2-digit', year:'numeric'});
  doc.text(`${fecha} · ${ticketsHoy.length} factura${ticketsHoy.length !== 1 ? 's' : ''}`, W - M, 32, { align: 'right' });

  let y = 42;

  /* TOTAL */
  if(incluir.total){
    doc.setFillColor(...GRIS2);
    doc.roundedRect(M, y, W - 2 * M, 26, 3, 3, 'F');

    doc.setTextColor(...GRIS);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL FACTURADO', M + 6, y + 8);

    doc.setTextColor(...VERDE);
    doc.setFontSize(20);
    doc.text(fmt(totalFacturado), M + 6, y + 20);

    doc.setTextColor(...GRIS);
    doc.setFontSize(9);
    doc.text('GANANCIA', W - M - 6, y + 8, { align: 'right' });

    doc.setTextColor(...(gananciaTotal >= 0 ? VERDE : ROJO));
    doc.setFontSize(16);
    doc.text((gananciaTotal >= 0 ? '+' : '') + fmt(gananciaTotal), W - M - 6, y + 20, { align: 'right' });

    y += 32;
  }

  /* MÉTODOS */
  if(incluir.metodos){
    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Métodos de pago', M, y);
    y += 6;

    const metodos = [
      ['Efectivo', efectivo],
      ['Débito', debito],
      ['Pago Móvil', pagoMovil],
      ['Otros', otros]
    ];

    metodos.forEach(([label, monto]) => {
      if(monto <= 0) return;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GRIS);
      doc.text(label, M + 2, y + 4);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NEGRO);
      doc.text(fmt(monto), W - M - 2, y + 4, { align: 'right' });
      y += 7;
    });

    y += 4;
  }

  /* PRODUCTOS */
  if(incluir.productos){
    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Productos vendidos', M, y);
    y += 6;

    const lista = Object.entries(productosVendidos).sort((a, b) => b[1] - a[1]);

    lista.forEach(([nombre, cant]) => {
      if(y > H - 30){
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...NEGRO);
      const nc = nombre.length > 45 ? nombre.slice(0, 45) + '…' : nombre;
      doc.text(nc, M + 2, y + 4);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GRIS);
      doc.text(`${cant} u`, W - M - 2, y + 4, { align: 'right' });
      y += 6;
    });

    y += 4;
  }

  /* STOCK */
  if(incluir.stock){
    doc.setFillColor(...GRIS2);
    doc.roundedRect(M, y, W - 2 * M, 12, 3, 3, 'F');

    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Stock descontado total', M + 6, y + 8);

    doc.setTextColor(...VERDE);
    doc.text(`${unidadesTotales} unidades`, W - M - 6, y + 8, { align: 'right' });

    y += 18;
  }

  /* FACTURAS */
  if(incluir.facturas && modo === 'avanzado'){
    doc.addPage();
    y = 20;

    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Facturas del día', M, y);
    y += 10;

    const ordenadas = [...ticketsHoy].sort((a, b) => a.fecha < b.fecha ? -1 : 1);

    ordenadas.forEach((t, idx) => {
      if(y > H - 40){
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(...VERDE);
      doc.rect(M, y, W - 2 * M, 8, 'F');

      doc.setTextColor(...BLANCO);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(t.numero || `#${idx + 1}`, M + 3, y + 5.5);

      const hora = t.fecha.slice(11, 16);
      doc.text(hora, W - M - 3, y + 5.5, { align: 'right' });

      y += 10;

      if(t.clienteNombre){
        doc.setTextColor(...GRIS);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Cliente: ${t.clienteNombre}`, M + 3, y);
        y += 5;
      }

      doc.setFontSize(8);
      (t.items || []).forEach(it => {
        if(y > H - 20){
          doc.addPage();
          y = 20;
        }
        doc.setTextColor(...NEGRO);
        doc.setFont('helvetica', 'normal');
        const nombre = (it.nombre || '—').slice(0, 40);
        doc.text(`  ${it.cantidad}x ${nombre}`, M + 3, y);

        doc.setFont('helvetica', 'bold');
        doc.text(fmt(it.cantidad * it.precioUnitario), W - M - 3, y, { align: 'right' });
        y += 4.5;
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...VERDE);
      doc.text(`Total: ${fmt(t.total)}`, W - M - 3, y + 2, { align: 'right' });
      y += 10;
    });
  }

  /* FOOTER */
  const totalPags = doc.internal.getNumberOfPages();
  for(let i = 1; i <= totalPags; i++){
    doc.setPage(i);
    doc.setDrawColor(...VERDE);
    doc.setLineWidth(0.3);
    doc.line(M, H - 12, W - M, H - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text('Generado con Stoki', M, H - 6);
    doc.text(`Página ${i} de ${totalPags}`, W - M, H - 6, { align: 'right' });
  }

  const nombreArchivo = `Cierre-${hoy}.pdf`;
  previsualizarPDF(doc, nombreArchivo, 'Cierre');

  if(navigator.vibrate) navigator.vibrate(20);
}

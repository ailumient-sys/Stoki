/* =========================================================
   views/inventory-pdf.js — Exportar a PDF
   - Inventario: tabla técnica (landscape)
   - Catálogo: cuadrícula con imágenes (portrait) para clientes
   v13: el toast de éxito lo maneja exporter.js
   ========================================================= */

const PDF_VERDE      = [34, 197, 94];
const PDF_VERDE_OSC  = [22, 163, 74];
const PDF_NEGRO      = [26, 26, 26];
const PDF_GRIS       = [130, 130, 130];
const PDF_GRIS_CLARO = [245, 246, 248];
const PDF_BLANCO     = [255, 255, 255];

/* =========================================================
   EXPORTAR INVENTARIO (tabla técnica)
   ========================================================= */
async function exportarInventarioPDF(){
  if(typeof window.jspdf === 'undefined'){
    toast('⚠️ Generador PDF no cargado. Revisá tu internet.');
    return;
  }

  const productos = window.DB.products || [];

  if(!productos.length){
    toast('⚠️ No hay productos para exportar');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15;

  let valorTotalStock = 0;
  let unidadesTotales = 0;

  productos.forEach(p => {
    const c = calc(p);
    valorTotalStock += c.stock * c.costoU;
    unidadesTotales += c.stock;
  });

  const negocio = window.DB.settings.business || {};
  const nombreNegocio = negocio.nombre || 'Mi negocio';
  const fecha = new Date().toLocaleDateString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const lista = [...productos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );

  const colX = {
    num:     M,
    nombre:  M + 8,
    costo:   M + 130,
    precio:  M + 165,
    stock:   M + 205,
    valor:   M + 235
  };

  const tablaCabH = 8;
  const rowH      = 8;
  const footerH   = 18;

  let y = M;

  dibujarHeaderPDF(doc, {
    W, M,
    nombreNegocio,
    fecha,
    valorTotalStock,
    unidadesTotales,
    cantidad: productos.length
  });

  y = M + 42;

  dibujarCabeceraTablaPDF(doc, y, colX, M, W);
  y += tablaCabH;

  lista.forEach((p, idx) => {
    if(y + rowH > H - M - footerH){
      dibujarFooterPDF(doc, { W, H, M, valorTotalStock, unidadesTotales });

      doc.addPage();
      dibujarMarcaDeAguaPDF(doc, W, H);
      dibujarHeaderCompactoPDF(doc, { W, M, nombreNegocio, fecha });

      y = M + 22;
      dibujarCabeceraTablaPDF(doc, y, colX, M, W);
      y += tablaCabH;
    }

    const c = calc(p);
    dibujarFilaPDF(doc, y, idx, p, c, colX, M, W);
    y += rowH;
  });

  dibujarFooterPDF(doc, { W, H, M, valorTotalStock, unidadesTotales });

  const nombreArchivo = `Inventario-${todayISO()}.pdf`;

  /* Guardar (exporter.js maneja el toast) */
  if(typeof tieneCapacitor === 'function' && tieneCapacitor()){
    const pdfBase64 = doc.output('datauristring');
    const r = await guardarArchivo(pdfBase64, nombreArchivo, 'Inventario');
    if(!r.ok){
      toast('⚠️ No se pudo guardar el PDF');
    }
  } else {
    doc.save(nombreArchivo);
    toast('📄 PDF descargado');
  }
}

/* =========================================================
   EXPORTAR CATÁLOGO (cuadrícula con imágenes)
   ========================================================= */
async function exportarCatalogoPDF(){
  if(typeof window.jspdf === 'undefined'){
    toast('⚠️ Generador PDF no cargado. Revisá tu internet.');
    return;
  }

  const productos = (window.DB.products || []).filter(p => calc(p).stock > 0);

  if(!productos.length){
    toast('⚠️ No hay productos con stock para el catálogo');
    return;
  }

  if(document.querySelector('#m-catalog-loading')) return;

  const loadingHTML = `
    <div class="overlay centered open" id="m-catalog-loading">
      <div class="sheet" style="position:relative;text-align:center;max-width:340px">
        <h2 style="margin-bottom:10px">Generando catálogo...</h2>
        <div class="sub" style="margin-bottom:14px">
          Procesando ${productos.length} producto${productos.length !== 1 ? 's' : ''}
        </div>
        <div style="font-size:44px">🖼️</div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', loadingHTML);

  try{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 15;

    const negocio = window.DB.settings.business || {};
    const nombreNegocio = negocio.nombre || 'Mi negocio';
    const fecha = new Date().toLocaleDateString('es-VE', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const cols = 2;
    const porPagina = 6;
    const gapX = 10;
    const gapY = 6;
    const cardW = (W - 2 * M - gapX * (cols - 1)) / cols;
    const imgH = 48;
    const cardH = 70;

    const lista = [...productos].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );

    const imagenes = await Promise.all(
      lista.map(async p => {
        const foto = getFotoPrincipal(p);
        if(!foto) return null;
        try{
          return await prepararImagenCatalogo(foto, 500, 300);
        }catch(e){
          return null;
        }
      })
    );

    const totalPaginas = Math.ceil(lista.length / porPagina);

    for(let pagina = 0; pagina < totalPaginas; pagina++){
      if(pagina > 0) doc.addPage();

      doc.setFillColor(...PDF_BLANCO);
      doc.rect(0, 0, W, H, 'F');
      dibujarMarcaDeAguaPDF(doc, W, H);

      if(pagina === 0){
        dibujarHeaderCatalogoPDF(doc, { W, M, nombreNegocio, fecha, total: lista.length });
      } else {
        dibujarHeaderCompactoCatalogoPDF(doc, { W, M, nombreNegocio, fecha });
      }

      const startY = pagina === 0 ? M + 40 : M + 24;

      const inicio = pagina * porPagina;
      const fin = Math.min(inicio + porPagina, lista.length);

      for(let i = inicio; i < fin; i++){
        const pos = i - inicio;
        const col = pos % cols;
        const row = Math.floor(pos / cols);

        const x = M + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);

        dibujarCardCatalogoPDF(
          doc, x, y, cardW, cardH, imgH,
          lista[i],
          imagenes[i]
        );
      }
    }

    const nombreArchivo = `Catalogo-${todayISO()}.pdf`;

    /* Guardar (exporter.js maneja el toast) */
    if(typeof tieneCapacitor === 'function' && tieneCapacitor()){
      const pdfBase64 = doc.output('datauristring');
      const r = await guardarArchivo(pdfBase64, nombreArchivo, 'Catalogo');
      if(!r.ok){
        toast('⚠️ No se pudo guardar el catálogo');
      }
    } else {
      doc.save(nombreArchivo);
      toast('🖼️ Catálogo descargado');
    }

    const loadEl = document.querySelector('#m-catalog-loading');
    if(loadEl) loadEl.remove();

    if(navigator.vibrate) navigator.vibrate(20);

  }catch(e){
    console.error('Error generando catálogo:', e);
    const loadEl = document.querySelector('#m-catalog-loading');
    if(loadEl) loadEl.remove();
    toast('⚠️ No se pudo generar el catálogo');
  }
}

/* =========================================================
   CARD DEL CATÁLOGO
   ========================================================= */
function dibujarCardCatalogoPDF(doc, x, y, w, h, imgH, producto, imgData){
  const c = calc(producto);

  doc.setFillColor(...PDF_GRIS_CLARO);
  doc.roundedRect(x, y, w, h, 3, 3, 'F');

  doc.setDrawColor(225, 228, 232);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 3, 3, 'S');

  const pad = 2;
  const imgW = w - pad * 2;
  const imgHReal = imgH - pad;

  if(imgData){
    try{
      doc.addImage(imgData, 'JPEG', x + pad, y + pad, imgW, imgHReal, undefined, 'FAST');
    }catch(e){
      dibujarPlaceholderFoto(doc, x + pad, y + pad, imgW, imgHReal, producto);
    }
  } else {
    dibujarPlaceholderFoto(doc, x + pad, y + pad, imgW, imgHReal, producto);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_NEGRO);

  const nombreMax = producto.nombre.length > 32
    ? producto.nombre.slice(0, 32) + '…'
    : producto.nombre;

  doc.text(nombreMax, x + w / 2, y + imgH + 8, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PDF_VERDE);
  doc.text(fmt(c.precioVenta), x + w / 2, y + imgH + 19, { align: 'center' });
}

function dibujarPlaceholderFoto(doc, x, y, w, h, producto){
  doc.setFillColor(235, 237, 240);
  doc.rect(x, y, w, h, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(44);
  doc.setTextColor(180, 185, 192);

  const inicial = (producto.nombre || '?').charAt(0).toUpperCase();
  doc.text(inicial, x + w / 2, y + h / 2 + 14, { align: 'center' });
}

/* =========================================================
   PREPARAR IMAGEN
   ========================================================= */
function prepararImagenCatalogo(base64, targetW, targetH){
  return new Promise(resolve => {
    const img = new Image();

    img.onload = () => {
      try{
        const canvas = document.createElement('canvas');
        canvas.width  = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        const scale = Math.max(targetW / img.width, targetH / img.height);
        const dw = img.width  * scale;
        const dh = img.height * scale;
        const dx = (targetW - dw) / 2;
        const dy = (targetH - dh) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);

        ctx.drawImage(img, dx, dy, dw, dh);

        resolve(canvas.toDataURL('image/jpeg', 0.82));
      }catch(e){
        console.error('Error preparando imagen:', e);
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = base64;
  });
}

/* =========================================================
   HEADERS Y FOOTERS
   ========================================================= */
function dibujarHeaderPDF(doc, { W, M, nombreNegocio, fecha, valorTotalStock, unidadesTotales, cantidad }){
  doc.setFillColor(...PDF_BLANCO);
  doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), 'F');
  dibujarMarcaDeAguaPDF(doc, W, doc.internal.pageSize.getHeight());

  doc.setFillColor(...PDF_VERDE);
  doc.rect(0, 0, W, 22, 'F');

  doc.setTextColor(...PDF_BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Stoki', M, 14);

  doc.setFontSize(14);
  doc.text('Inventario', W - M, 14, { align: 'right' });

  doc.setTextColor(...PDF_NEGRO);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  let y = 32;
  doc.text(`Negocio: ${nombreNegocio}`, M, y);
  doc.text(`Fecha: ${fecha}`, W - M, y, { align: 'right' });

  y += 6;
  doc.setTextColor(...PDF_GRIS);
  doc.setFontSize(9);
  doc.text(
    `${cantidad} producto${cantidad !== 1 ? 's' : ''} · ${unidadesTotales} unidades en stock`,
    M, y
  );

  doc.setTextColor(...PDF_VERDE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Valor total: ${fmt(valorTotalStock)}`, W - M, y, { align: 'right' });
}

function dibujarHeaderCompactoPDF(doc, { W, M, nombreNegocio, fecha }){
  doc.setFillColor(...PDF_VERDE);
  doc.rect(0, 0, W, 14, 'F');

  doc.setTextColor(...PDF_BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Stoki', M, 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${nombreNegocio} · ${fecha}`, W - M, 9.5, { align: 'right' });
}

function dibujarCabeceraTablaPDF(doc, y, colX, M, W){
  doc.setFillColor(...PDF_VERDE);
  doc.rect(M, y, W - 2 * M, 8, 'F');

  doc.setTextColor(...PDF_BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  doc.text('Nº',       colX.num + 2,    y + 5.5);
  doc.text('PRODUCTO', colX.nombre + 2, y + 5.5);
  doc.text('COSTO U',  colX.costo,      y + 5.5);
  doc.text('P. VENTA', colX.precio,     y + 5.5);
  doc.text('STOCK',    colX.stock + 12, y + 5.5, { align: 'center' });
  doc.text('VALOR',    colX.valor + 24, y + 5.5, { align: 'center' });
}

function dibujarFilaPDF(doc, y, idx, p, c, colX, M, W){
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  doc.setTextColor(...PDF_GRIS);
  doc.text(String(idx + 1), colX.num + 2, y + 5.5);

  doc.setTextColor(...PDF_NEGRO);
  doc.setFont('helvetica', 'bold');
  const nombre = p.nombre.length > 42 ? p.nombre.slice(0, 42) + '…' : p.nombre;
  doc.text(nombre, colX.nombre + 2, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_NEGRO);
  doc.text(fmt(c.costoU), colX.costo, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_VERDE);
  doc.text(fmt(c.precioVenta), colX.precio, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_NEGRO);
  doc.text(String(c.stock), colX.stock + 12, y + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(fmt(c.stock * c.costoU), colX.valor + 24, y + 5.5, { align: 'center' });

  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.1);
  doc.line(M, y + 8, W - M, y + 8);
}

function dibujarFooterPDF(doc, { W, H, M, valorTotalStock, unidadesTotales }){
  const y = H - M - 6;

  doc.setDrawColor(...PDF_VERDE);
  doc.setLineWidth(0.4);
  doc.line(M, y - 4, W - M, y - 4);

  doc.setTextColor(...PDF_NEGRO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Total:', M, y + 1);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_GRIS);
  doc.text(`${unidadesTotales} unidades`, M + 20, y + 1);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_VERDE);
  doc.setFontSize(12);
  doc.text(fmt(valorTotalStock), W - M, y + 1, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...PDF_GRIS);
  doc.text('Generado con Stoki', W - M, y + 7, { align: 'right' });
}

function dibujarHeaderCatalogoPDF(doc, { W, M, nombreNegocio, fecha, total }){
  doc.setFillColor(...PDF_VERDE);
  doc.rect(0, 0, W, 22, 'F');

  doc.setTextColor(...PDF_BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Stoki', M, 14);

  doc.setFontSize(14);
  doc.text('Catálogo', W - M, 14, { align: 'right' });

  doc.setTextColor(...PDF_NEGRO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(nombreNegocio, M, 32);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_GRIS);
  doc.setFontSize(9);
  doc.text(`${total} productos · ${fecha}`, W - M, 32, { align: 'right' });
}

function dibujarHeaderCompactoCatalogoPDF(doc, { W, M, nombreNegocio, fecha }){
  doc.setFillColor(...PDF_VERDE);
  doc.rect(0, 0, W, 14, 'F');

  doc.setTextColor(...PDF_BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Stoki · Catálogo', M, 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${nombreNegocio} · ${fecha}`, W - M, 9.5, { align: 'right' });
}

function dibujarMarcaDeAguaPDF(doc, W, H){
  doc.setGState(new doc.GState({ opacity: 0.10 }));
  doc.setTextColor(...PDF_VERDE);
  doc.setFont('helvetica', 'bold');

  const isPortrait = H > W;

  if(isPortrait){
    doc.setFontSize(80);
    doc.text('Stoki', W * 0.30, H * 0.18, { angle: 45, align: 'center' });
    doc.text('Stoki', W * 0.75, H * 0.36, { angle: 45, align: 'center' });
    doc.text('Stoki', W * 0.20, H * 0.55, { angle: 45, align: 'center' });
    doc.text('Stoki', W * 0.65, H * 0.72, { angle: 45, align: 'center' });
    doc.text('Stoki', W * 0.30, H * 0.92, { angle: 45, align: 'center' });
  } else {
    doc.setFontSize(110);
    doc.text('Stoki', W * 0.28, H * 0.55, { angle: 45, align: 'center' });
    doc.text('Stoki', W * 0.70, H * 0.88, { angle: 45, align: 'center' });
    doc.text('Stoki', W * 0.05, H * 0.92, { angle: 45, align: 'center' });
  }

  doc.setGState(new doc.GState({ opacity: 1 }));
}

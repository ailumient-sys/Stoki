/* =========================================================
   views/inventory-pdf.js — Exportar a PDF
   v14: marca de agua con logo + previsualización
   ========================================================= */

const PDF_VERDE      = [34, 197, 94];
const PDF_VERDE_OSC  = [22, 163, 74];
const PDF_NEGRO      = [26, 26, 26];
const PDF_GRIS       = [130, 130, 130];
const PDF_GRIS_CLARO = [245, 246, 248];
const PDF_BLANCO     = [255, 255, 255];

/* Cache del logo en base64 */
let _logoPDFCache = null;

async function obtenerLogoPDF(){
  if(_logoPDFCache) return _logoPDFCache;
  try{
    const resp = await fetch('icon-192.png');
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        _logoPDFCache = reader.result;
        resolve(_logoPDFCache);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }catch(e){
    console.warn('No se pudo cargar el logo:', e);
    return null;
  }
}

/* =========================================================
   MARCA DE AGUA CON LOGO
   ========================================================= */
async function dibujarMarcaDeAguaLogoPDF(doc, W, H, opacidad){
  const op = (typeof opacidad === 'number') ? opacidad : 0.05;
  const logo = await obtenerLogoPDF();
  if(!logo) return;

  doc.setGState(new doc.GState({ opacity: op }));

  const s = 22;   /* Logo chico */
  const m = 10;   /* Margen desde el borde */

  try{
    /* 4 esquinas */
    doc.addImage(logo, 'PNG', m, m, s, s);                     /* arriba izq */
    doc.addImage(logo, 'PNG', W - s - m, m, s, s);             /* arriba der */
    doc.addImage(logo, 'PNG', m, H - s - m, s, s);             /* abajo izq */
    doc.addImage(logo, 'PNG', W - s - m, H - s - m, s, s);     /* abajo der */
  }catch(e){
    console.warn('Error al dibujar logo:', e);
  }

  doc.setGState(new doc.GState({ opacity: 1 }));
}

/* =========================================================
   PREVISUALIZACIÓN
   ========================================================= */
function previsualizarPDF(doc, nombreArchivo, tipo){
  const pdfDataUri = doc.output('datauristring');

  const overlay = document.createElement('div');
  overlay.className = 'overlay centered open';
  overlay.id = 'm-pdf-preview';
  overlay.style.zIndex = '200';

  overlay.innerHTML = `
    <div class="sheet" style="max-width:96vw;max-height:96vh;
                padding:10px;display:flex;flex-direction:column">
      <button class="x" id="pdf-prev-close">✕</button>

      <div style="font-size:13px;font-weight:800;text-align:center;
                  margin:4px 30px 10px;color:var(--dim);
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${esc(nombreArchivo)}
      </div>

      <div id="pdf-prev-pages"
           style="flex:1;overflow-y:auto;border-radius:10px;
                  background:#1a1a1a;padding:8px;
                  display:flex;flex-direction:column;gap:10px;
                  align-items:center;min-height:200px">
        <div style="color:var(--dim);padding:30px;text-align:center;font-size:13px">
          ⏳ Cargando preview...
        </div>
      </div>

      <button class="btn-main" id="pdf-prev-save" style="margin-top:12px">
        📤 Guardar / Compartir
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.querySelector('#pdf-prev-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => {
    if(e.target.id === 'm-pdf-preview') overlay.remove();
  });

  document.querySelector('#pdf-prev-save').addEventListener('click', async () => {
    overlay.remove();
    const base64 = doc.output('datauristring');

    if(typeof tieneCapacitor === 'function' && tieneCapacitor()){
      const r = await guardarArchivo(base64, nombreArchivo, tipo);
      if(!r.ok) toast('⚠️ No se pudo guardar');
    } else {
      doc.save(nombreArchivo);
      toast('📄 PDF descargado');
    }
  });

  /* Renderizar el PDF con PDF.js */
  renderizarPDFEnPreview(pdfDataUri);
}

async function renderizarPDFEnPreview(pdfDataUri){
  const cont = document.querySelector('#pdf-prev-pages');
  if(!cont) return;

  if(typeof window.pdfjsLib === 'undefined'){
    cont.innerHTML = `
      <div style="color:var(--dim);padding:30px;text-align:center;font-size:13px">
        ⚠️ PDF.js no cargó.<br>Usá el botón de abajo para ver el archivo.
      </div>`;
    return;
  }

  try{
    /* Configurar el worker (necesario para que funcione) */
    if(!window.pdfjsLib.GlobalWorkerOptions.workerSrc){
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }

    /* Convertir data URI a Uint8Array */
    const base64 = pdfDataUri.split(',')[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;

    cont.innerHTML = '';

    for(let n = 1; n <= pdf.numPages; n++){
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: 1.4 });

      const canvas = document.createElement('canvas');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      canvas.style.maxWidth = '100%';
      canvas.style.height = 'auto';
      canvas.style.borderRadius = '6px';
      canvas.style.background = '#fff';
      canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,.4)';

      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      cont.appendChild(canvas);
    }

  }catch(e){
    console.error('Error renderizando PDF:', e);
    cont.innerHTML = `
      <div style="color:var(--dim);padding:30px;text-align:center;font-size:13px">
        ⚠️ No se pudo mostrar el preview.<br>
        Usá el botón de abajo para abrirlo.
      </div>`;
  }
}/* =========================================================
   EXPORTAR INVENTARIO
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
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

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

  await dibujarHeaderPDF(doc, {
    W, M, nombreNegocio, fecha, valorTotalStock, unidadesTotales,
    cantidad: productos.length
  });

  y = M + 42;

  dibujarCabeceraTablaPDF(doc, y, colX, M, W);
  y += tablaCabH;

  lista.forEach((p, idx) => {
    if(y + rowH > H - M - footerH){
      dibujarFooterPDF(doc, { W, H, M, valorTotalStock, unidadesTotales });

      doc.addPage();
      y = M + 22;

      dibujarMarcaDeAguaLogoPDF(doc, W, H);
      dibujarHeaderCompactoPDF(doc, { W, M, nombreNegocio, fecha });
      dibujarCabeceraTablaPDF(doc, y, colX, M, W);
      y += tablaCabH;
    }

    const c = calc(p);
    dibujarFilaPDF(doc, y, idx, p, c, colX, M, W);
    y += rowH;
  });

  dibujarFooterPDF(doc, { W, H, M, valorTotalStock, unidadesTotales });

  const nombreArchivo = `Inventario-${todayISO()}.pdf`;
  previsualizarPDF(doc, nombreArchivo, 'Inventario');
}

/* =========================================================
   EXPORTAR CATÁLOGO
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

      await dibujarMarcaDeAguaLogoPDF(doc, W, H);

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

        dibujarCardCatalogoPDF(doc, x, y, cardW, cardH, imgH, lista[i], imagenes[i]);
      }
    }

    const loadEl = document.querySelector('#m-catalog-loading');
    if(loadEl) loadEl.remove();

    const nombreArchivo = `Catalogo-${todayISO()}.pdf`;
    previsualizarPDF(doc, nombreArchivo, 'Catalogo');

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
  let imgW = w - pad * 2;
  let imgHReal = imgH - pad;

  /* Mantener aspect ratio 5:3 (como prepara prepararImagenCatalogo) */
  const aspect = 500 / 300;
  if(imgW / imgHReal > aspect){
    imgW = imgHReal * aspect;
  } else {
    imgHReal = imgW / aspect;
  }

  /* Centrar horizontalmente */
  const imgX = x + pad + ((w - pad * 2) - imgW) / 2;
  const imgY = y + pad;

  if(imgData){
    try{
      doc.addImage(imgData, 'JPEG', imgX, imgY, imgW, imgHReal, undefined, 'FAST');
    }catch(e){
      dibujarPlaceholderFoto(doc, x + pad, y + pad, w - pad * 2, imgH - pad, producto);
    }
  } else {
    dibujarPlaceholderFoto(doc, x + pad, y + pad, w - pad * 2, imgH - pad, producto);
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
async function dibujarHeaderPDF(doc, { W, M, nombreNegocio, fecha, valorTotalStock, unidadesTotales, cantidad }){
  doc.setFillColor(...PDF_BLANCO);
  doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), 'F');

  await dibujarMarcaDeAguaLogoPDF(doc, W, doc.internal.pageSize.getHeight());

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
  doc.text(`${cantidad} producto${cantidad !== 1 ? 's' : ''} · ${unidadesTotales} unidades en stock`, M, y);

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

  if(categoriaNombre){
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_VERDE);
    doc.text(categoriaNombre, M, 20);
  }
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

function dibujarHeaderCatalogoPDF(doc, { W, M, nombreNegocio, fecha, total, categoriaNombre }){
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

  if(categoriaNombre){
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...PDF_VERDE);
    doc.text(categoriaNombre, M, 40);
  }
}

function dibujarHeaderCompactoCatalogoPDF(doc, { W, M, nombreNegocio, fecha, categoriaNombre }){
  doc.setFillColor(...PDF_VERDE);
  doc.rect(0, 0, W, 14, 'F');

  doc.setTextColor(...PDF_BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Stoki · Catálogo', M, 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${nombreNegocio} · ${fecha}`, W - M, 9.5, { align: 'right' });

  if(categoriaNombre){
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_VERDE);
    doc.text(categoriaNombre, M, 20);
  }
}


/* =========================================================
   EXPORTACIÓN UNIFICADA CON OPCIONES
   ========================================================= */
async function exportarConOpciones(tipo){
  if(typeof window.jspdf === 'undefined'){
    toast('⚠️ Generador PDF no cargado');
    return;
  }

  const opciones = (typeof expOpciones !== 'undefined') ? expOpciones : (window.expOpciones || {});

  if(tipo === 'inventario'){
    await generarInventarioPDF(opciones);
  } else if(tipo === 'catalogo'){
    await generarCatalogoPDF(opciones);
  } else if(tipo === 'ambos'){
    /* Generar catálogo primero */
    await generarCatalogoPDF(opciones, true);
    /* Luego inventario */
    setTimeout(() => generarInventarioPDF(opciones), 500);
  }
}

async function generarInventarioPDF(op){
  const productos = window.DB.products || [];
  if(!productos.length){
    toast('⚠️ No hay productos para exportar');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

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

  await dibujarHeaderPDF(doc, {
    W, M, nombreNegocio, fecha, valorTotalStock, unidadesTotales,
    cantidad: productos.length
  });

  if(op && op.imagenFondo){
    dibujarImagenFondoPDF(doc, op.imagenFondo, W, H);
  }

  y = M + 42;

  dibujarCabeceraTablaPDF(doc, y, colX, M, W);
  y += tablaCabH;

  lista.forEach((p, idx) => {
    if(y + rowH > H - M - footerH){
      dibujarFooterPDF(doc, { W, H, M, valorTotalStock, unidadesTotales });

      doc.addPage();
      y = M + 22;

      dibujarMarcaDeAguaLogoPDF(doc, W, H);
      if(op && op.imagenFondo) dibujarImagenFondoPDF(doc, op.imagenFondo, W, H);
      dibujarHeaderCompactoPDF(doc, { W, M, nombreNegocio, fecha });
      dibujarCabeceraTablaPDF(doc, y, colX, M, W);
      y += tablaCabH;
    }

    const c = calc(p);
    dibujarFilaPDF(doc, y, idx, p, c, colX, M, W);
    y += rowH;
  });

  dibujarFooterPDF(doc, { W, H, M, valorTotalStock, unidadesTotales });

  const nombreArchivo = `Inventario-${todayISO()}.pdf`;
  previsualizarPDF(doc, nombreArchivo, 'Inventario');
}

async function generarCatalogoPDF(op, noPreview){
  const productos = (window.DB.products || []).filter(p => calc(p).stock > 0);
  if(!productos.length){
    toast('⚠️ No hay productos con stock');
    return;
  }

  if(!noPreview && document.querySelector('#m-catalog-loading')) return;

  if(!noPreview){
    document.body.insertAdjacentHTML('beforeend', `
      <div class="overlay centered open" id="m-catalog-loading">
        <div class="sheet" style="text-align:center;max-width:340px">
          <h2 style="margin-bottom:10px">Generando catálogo...</h2>
          <div class="sub" style="margin-bottom:14px">
            ${productos.length} producto${productos.length !== 1 ? 's' : ''}
          </div>
          <div style="font-size:44px">🖼️</div>
        </div>
      </div>`);
  }

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
    const porPagina = 3;
    const gapX = 8;
    const gapY = 6;
    const cardW = (W - 2 * M - gapX * (cols - 1)) / cols;

    const altoDisponible = H - (M + 40) - M - 15;
    const cardH = altoDisponible / porPagina - gapY;
    const imgH = cardH - 22;

    /* Agrupar por categoría si corresponde */
    let grupos;
    if(op.separarCategorias){
      const cats = obtenerCategorias();
      grupos = cats.map(cat => ({
        nombre: `${cat.emoji || '🏷️'} ${cat.nombre}`,
        items: productos.filter(p => p.categoriaId === cat.id)
      })).filter(g => g.items.length);

      const sinCat = productos.filter(p => !p.categoriaId || !buscarCategoria(p.categoriaId));
      if(sinCat.length){
        grupos.push({ nombre: '📦 Sin categoría', items: sinCat });
      }
    } else {
      grupos = [{
        nombre: null,
        items: [...productos].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
        )
      }];
    }

    /* Pre-renderizar imágenes */
    const imagenesMap = {};
    for(const p of productos){
      const foto = getFotoPrincipal(p);
      imagenesMap[p.id] = foto ? await prepararImagenCatalogo(foto, 500, 300) : null;
    }

    let esPrimeraHoja = true;

    for(const grupo of grupos){
      const totalGrupo = Math.ceil(grupo.items.length / (cols * porPagina));

      for(let paginaGrupo = 0; paginaGrupo < totalGrupo; paginaGrupo++){
        if(!esPrimeraHoja) doc.addPage();
        esPrimeraHoja = false;

        doc.setFillColor(...PDF_BLANCO);
        doc.rect(0, 0, W, H, 'F');

        if(op.imagenFondo){
          dibujarImagenFondoPDF(doc, op.imagenFondo, W, H);
          await dibujarMarcaDeAguaLogoPDF(doc, W, H, 0.70);
        } else {
          await dibujarMarcaDeAguaLogoPDF(doc, W, H, 0.05);
        }

        if(paginaGrupo === 0){
          dibujarHeaderCatalogoPDF(doc, { W, M, nombreNegocio, fecha, total: grupo.items.length, categoriaNombre: grupo.nombre });
        } else {
          dibujarHeaderCompactoCatalogoPDF(doc, { W, M, nombreNegocio, fecha, categoriaNombre: grupo.nombre });
        }

        const startY = M + 40;
        const inicio = paginaGrupo * cols * porPagina;
        const fin = Math.min(inicio + cols * porPagina, grupo.items.length);

        for(let i = inicio; i < fin; i++){
          const pos = i - inicio;
          const col = pos % cols;
          const row = Math.floor(pos / cols);

          const x = M + col * (cardW + gapX);
          const y = startY + row * (cardH + gapY);

          dibujarCardCatalogoPDF(doc, x, y, cardW, cardH, imgH, grupo.items[i], imagenesMap[grupo.items[i].id]);
        }

        /* Footer con categoría y página */
        dibujarFooterCategoriaPDF(doc, {
          W, H, M,
          categoriaNombre: grupo.nombre,
          paginaActual: paginaGrupo + 1,
          paginasTotales: totalGrupo
        });
      }
    }

    const loadEl = document.querySelector('#m-catalog-loading');
    if(loadEl) loadEl.remove();

    const nombreArchivo = `Catalogo-${todayISO()}.pdf`;

    if(noPreview){
      const base64 = doc.output('datauristring');
      if(typeof tieneCapacitor === 'function' && tieneCapacitor()){
        await guardarArchivo(base64, nombreArchivo, 'Catalogo');
      } else {
        doc.save(nombreArchivo);
      }
      toast('📄 Catálogo generado');
    } else {
      previsualizarPDF(doc, nombreArchivo, 'Catalogo');
    }

    if(navigator.vibrate) navigator.vibrate(20);

  }catch(e){
    console.error('Error generando catálogo:', e);
    const loadEl = document.querySelector('#m-catalog-loading');
    if(loadEl) loadEl.remove();
    toast('⚠️ No se pudo generar el catálogo');
  }
}

/* Imagen de fondo */
function dibujarImagenFondoPDF(doc, base64, W, H){
  try{
    doc.setGState(new doc.GState({ opacity: 0.90 }));
    doc.addImage(base64, 'JPEG', 0, 0, W, H, undefined, 'FAST');
    doc.setGState(new doc.GState({ opacity: 1 }));
  }catch(e){
    console.warn('Error al dibujar fondo:', e);
  }
}

/* =========================================================
   FOOTER CON CATEGORÍA + PÁGINA
   ========================================================= */
function dibujarFooterCategoriaPDF(doc, { W, H, M, categoriaNombre, paginaActual, paginasTotales }){
  doc.setDrawColor(...PDF_VERDE);
  doc.setLineWidth(0.3);
  doc.line(M, H - 12, W - M, H - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_GRIS);

  const negocio = (window.DB.settings.business || {}).nombre || 'Stoki';
  doc.text(negocio, M, H - 6);

  const texto = categoriaNombre
    ? `${categoriaNombre}  ${paginaActual}/${paginasTotales}`
    : `Página ${paginaActual}/${paginasTotales}`;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_VERDE);
  doc.text(texto, W - M, H - 6, { align: 'right' });
}

/* restock-page.js — Página de reabastecer (parte 1) */
let _rpBusqueda = '';
let _rpFiltro = 'bajo';
let _rpProveedorFiltro = null;

function abrirRestockPage(){
  const cont = document.querySelector('#v-restock');
  if(!cont) return;

  _rpBusqueda = '';
  _rpFiltro = 'bajo';
  _rpProveedorFiltro = null;

  renderRestockPage();
}

function renderRestockPage(){
  const cont = document.querySelector('#v-restock');
  if(!cont) return;

  const todos = (window.DB.products || []).filter(p => {
    const t = tipoDe(p);
    return t === 'producto' || t === 'material';
  });

  let lista = [...todos];

  /* Filtro por estado */
  if(_rpFiltro === 'bajo'){
    lista = lista.filter(p => {
      const c = calc(p);
      return c.estadoStock === 'urgente' || c.estadoStock === 'agotado' || c.estadoStock === 'atencion';
    });
  } else if(_rpFiltro === 'todo'){
    /* sin filtro */
  }

  /* Filtro por proveedor */
  if(_rpProveedorFiltro){
    const prov = (window.DB.suppliers || []).find(s => s.id === _rpProveedorFiltro);
    if(prov){
      lista = lista.filter(p => {
        const enArray = (prov.productoIds || []).includes(p.id);
        const enLotes = (p.lotes || []).some(l => l.proveedorId === prov.id);
        return enArray || enLotes;
      });
    }
  }

  /* Búsqueda */
  if(_rpBusqueda){
    const q = normalize(_rpBusqueda);
    lista = lista.filter(p => normalize(p.nombre).includes(q));
  }

  /* Ordenar: bajo stock primero */
  lista.sort((a, b) => {
    const ca = calc(a);
    const cb = calc(b);
    const pa = { agotado:0, urgente:1, atencion:2, ok:3 }[ca.estadoStock] || 4;
    const pb = { agotado:0, urgente:1, atencion:2, ok:3 }[cb.estadoStock] || 4;
    if(pa !== pb) return pa - pb;
    return a.nombre.localeCompare(b.nombre, 'es');
  });

  const bajosCount = todos.filter(p => {
    const c = calc(p);
    return c.estadoStock === 'urgente' || c.estadoStock === 'agotado' || c.estadoStock === 'atencion';
  }).length;

  const filtrosHTML = `
    <div class="inv-tabs" style="margin-bottom:8px">
      <button class="inv-tab ${_rpFiltro==='bajo'?'active':''}" data-rpfiltro="bajo" type="button">⚠️ Bajo stock</button>
      <button class="inv-tab ${_rpFiltro==='todo'?'active':''}" data-rpfiltro="todo" type="button">📦 Todo</button>
    </div>
    <div class="inv-search" style="margin-bottom:8px">
      <input type="text" id="rp-search" placeholder="Buscar..." autocomplete="off" value="${esc(_rpBusqueda)}">
    </div>
    ${bajosCount > 0 ? `
      <button class="btn-ghost" id="rp-exportar" style="margin-bottom:10px">
        📄 Exportar lista de compras (${bajosCount})
      </button>
    ` : ''}
  `;

  const itemsHTML = lista.length
    ? lista.map(p => {
        const c = calc(p);
        const ti = tipoInfo(p);
        const u = unidadInfo(p.unidad || 'unidad');
        const stockTxt = c.stock === Infinity ? '∞' : fmtCantidadUnidad(c.stock, p.unidad);
        const color = { agotado:'var(--red)', urgente:'var(--red)', atencion:'var(--amber)', ok:'var(--green)' }[c.estadoStock];
        return `
          <div class="rp-item" data-id="${p.id}">
            <span class="rp-emoji">${ti.emoji}</span>
            <div class="rp-info">
              <div class="rp-nombre">${esc(p.nombre)}</div>
              <div class="rp-meta" style="color:${color}">Stock: ${stockTxt}</div>
            </div>
            <button class="rp-add" data-rpadd="${p.id}" type="button">+ Stock</button>
          </div>`;
      }).join('')
    : `<div class="empty" style="padding:40px 20px">
         <div class="ico">✅</div>
         <h3>Todo en orden</h3>
         <p>No hay productos con stock bajo.</p>
       </div>`;

  cont.innerHTML = filtrosHTML + `<div class="rp-list">${itemsHTML}</div>`;

  bindRestockPage();
}

/* ═══════════════════════════════════════════
   BIND de la página
   ═══════════════════════════════════════════ */
function bindRestockPage(){
  /* Tabs de filtro */
  document.querySelectorAll('[data-rpfiltro]').forEach(tab => {
    tab.onclick = () => {
      _rpFiltro = tab.dataset.rpfiltro;
      renderRestockPage();
    };
  });

  /* Búsqueda */
  const inp = document.querySelector('#rp-search');
  if(inp){
    inp.oninput = e => {
      _rpBusqueda = e.target.value;
      const pos = _rpBusqueda.length;
      renderRestockPage();
      const nuevo = document.querySelector('#rp-search');
      if(nuevo){ nuevo.focus(); nuevo.setSelectionRange(pos, pos); }
    };
  }

  /* Exportar lista */
  const btnExp = document.querySelector('#rp-exportar');
  if(btnExp){
    btnExp.onclick = () => {
      if(typeof exportarListaCompras === 'function') exportarListaCompras();
    };
  }

  /* Botones + Stock */
  document.querySelectorAll('[data-rpadd]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      abrirRestockItem(btn.dataset.rpadd);
    };
  });
}

/* ═══════════════════════════════════════════
   MODAL DE RESTOCK
   ═══════════════════════════════════════════ */
let _rpItemId = null;

function abrirRestockItem(id){
  const p = window.DB.products.find(x => x.id === id);
  if(!p) return;

  _rpItemId = id;

  const c = calc(p);
  const u = unidadInfo(p.unidad || 'unidad');
  const esFracc = p.unidad && p.unidad !== 'unidad';

  const stockTxt = fmtCantidadUnidad(c.stock, p.unidad || 'unidad');

  const h = `
    <div class="overlay" id="m-restock-item">
      <div class="sheet" style="position:relative">
        <div class="sheet-handle"></div>
        <button class="x" id="rst-close">✕</button>
        <h2>Reabastecer</h2>
        <div class="sub">${esc(p.nombre)}</div>

        <div class="restock-history-item" style="background:var(--bg3);border-radius:10px;padding:10px 14px;margin-bottom:12px">
          <span style="color:var(--dim);font-size:12px">Stock actual</span>
          <span style="font-weight:900;color:var(--txt)">${stockTxt}</span>
        </div>

        <label>Cantidad comprada</label>
        <div class="input-with-scan" style="gap:6px">
          <input id="rst-cant" type="number" inputmode="decimal" step="0.01" placeholder="0" min="0" style="flex:1">
          <span class="rst-unidad">${u.abreviacion}</span>
        </div>

        <div class="row2">
          <div>
            <label>Precio total</label>
            <input id="rst-total" type="number" inputmode="decimal" step="0.01" placeholder="0" min="0">
          </div>
          <div>
            <label>Costo por ${u.abreviacion}</label>
            <input id="rst-unit" type="number" inputmode="decimal" readonly>
          </div>
        </div>

        <label>Fecha</label>
        <input id="rst-fecha" type="date">

        <label>Proveedor <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span></label>
        <div id="rst-prov-list"></div>

        <div class="preview" id="rst-preview"></div>

        <button class="btn-main" id="rst-save">✅ Reabastecer</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', h);

  /* Fecha default */
  document.querySelector('#rst-fecha').value = todayISO();

  /* Renderizar proveedores */
  renderRestockProveedores(id);

  /* Bind: cálculo de costo unitario */
  ['#rst-cant', '#rst-total'].forEach(sel => {
    const el = document.querySelector(sel);
    if(el) el.oninput = () => { _rpCostoU(); _rpPreview(); };
  });

  /* Cerrar */
  const cerrar = () => {
    document.querySelector('#m-restock-item')?.remove();
    _rpItemId = null;
  };
  document.querySelector('#rst-close').onclick = cerrar;
  document.querySelector('#m-restock-item').onclick = e => {
    if(e.target.id === 'm-restock-item') cerrar();
  };

  /* Guardar */
  document.querySelector('#rst-save').onclick = guardarRestockItem;
}

function _rpCostoU(){
  const c = +document.querySelector('#rst-cant').value || 0;
  const t = +document.querySelector('#rst-total').value || 0;
  const el = document.querySelector('#rst-unit');
  if(el) el.value = c > 0 && t > 0 ? (t / c).toFixed(4) : '';
}

function _rpPreview(){
  const c = +document.querySelector('#rst-cant').value || 0;
  const t = +document.querySelector('#rst-total').value || 0;
  const u = +document.querySelector('#rst-unit').value || 0;
  const el = document.querySelector('#rst-preview');
  if(!el) return;
  el.innerHTML = `
    <div class="line"><span>Cantidad</span><b>${c}</b></div>
    <div class="line"><span>Costo total</span><b>${fmt(t)}</b></div>
    <div class="line"><span>Costo unitario</span><b>${fmt(u)}</b></div>
  `;
}

/* ═══════════════════════════════════════════
   PROVEEDORES en el modal de restock
   ═══════════════════════════════════════════ */
let _rpProvId = null;

function renderRestockProveedores(productoId){
  const cont = document.querySelector('#rst-prov-list');
  if(!cont) return;

  _rpProvId = null;

  const todos = window.DB.suppliers || [];
  const p = window.DB.products.find(x => x.id === productoId);
  if(!p) return;

  /* Relevantes: los que venden este producto */
  const relevantes = [];
  todos.forEach(prov => {
    const oculto = (prov.productoIdsOcultos || []).includes(p.id);
    if(oculto) return;

    const enArray = (prov.productoIds || []).includes(p.id);
    const enLotes = (p.lotes || []).some(l => l.proveedorId === prov.id);

    if(enArray || enLotes){
      const lotesProv = (p.lotes || []).filter(l => l.proveedorId === prov.id);
      const ultimo = lotesProv[lotesProv.length - 1];
      relevantes.push({
        proveedor: prov,
        ultimoPrecio: ultimo ? ultimo.costoUnitario : 0
      });
    }
  });

  /* Ordenar: más barato primero */
  relevantes.sort((a, b) => {
    if(a.ultimoPrecio > 0 && b.ultimoPrecio === 0) return -1;
    if(a.ultimoPrecio === 0 && b.ultimoPrecio > 0) return 1;
    if(a.ultimoPrecio > 0 && b.ultimoPrecio > 0) return a.ultimoPrecio - b.ultimoPrecio;
    return a.proveedor.nombre.localeCompare(b.proveedor.nombre, 'es');
  });

  const listaMostrar = relevantes.length
    ? relevantes
    : todos.map(t => ({ proveedor: t, ultimoPrecio: 0 }));

  if(!listaMostrar.length){
    cont.innerHTML = `<div class="rp-prov-empty">
      Sin proveedores guardados.
      <button type="button" class="rp-prov-nuevo" id="rst-prov-nuevo">➕ Crear proveedor</button>
    </div>`;
    document.querySelector('#rst-prov-nuevo').onclick = () => {
      if(typeof openSupplierNew === 'function') openSupplierNew();
    };
    return;
  }

  const html = `
    <div class="rp-prov-list">
      ${listaMostrar.map(item => {
        const prov = item.proveedor;
        const precio = item.ultimoPrecio;
        const inicial = esc((prov.nombre || '?').charAt(0).toUpperCase());
        const esRelevante = relevantes.length > 0;
        const precioTxt = precio > 0 ? fmt(precio) : 'Sin compras';

        return `
          <div class="rp-prov-row" data-provid="${prov.id}" data-precio="${precio}">
            <span class="rp-prov-avatar">${inicial}</span>
            <div class="rp-prov-info">
              <div class="rp-prov-nombre">${esc(prov.nombre)}</div>
              <div class="rp-prov-meta">${precio > 0 ? precioTxt + '/u' : (prov.tienda ? esc(prov.tienda) : 'Sin datos')}</div>
            </div>
          </div>`;
      }).join('')}
    </div>
    <button type="button" class="rp-prov-nuevo" id="rst-prov-nuevo" style="margin-top:6px">➕ Crear nuevo proveedor</button>
  `;

  cont.innerHTML = html;

  /* Bind: seleccionar proveedor */
  cont.querySelectorAll('.rp-prov-row').forEach(row => {
    row.onclick = () => {
      _rpProvId = row.dataset.provid;
      cont.querySelectorAll('.rp-prov-row').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
      if(navigator.vibrate) navigator.vibrate(10);
    };
  });

  document.querySelector('#rst-prov-nuevo').onclick = () => {
    if(typeof openSupplierNew === 'function') openSupplierNew();
  };
}

/* ═══════════════════════════════════════════
   GUARDAR RESTOCK
   ═══════════════════════════════════════════ */
function guardarRestockItem(){
  const p = window.DB.products.find(x => x.id === _rpItemId);
  if(!p) return toast('⚠️ Producto no encontrado');

  const cant = +document.querySelector('#rst-cant').value || 0;
  const total = +document.querySelector('#rst-total').value || 0;
  const fecha = document.querySelector('#rst-fecha').value || todayISO();

  if(cant <= 0) return toast('⚠️ Poné una cantidad mayor a 0');
  if(total <= 0) return toast('⚠️ Poné el costo');

  const costoU = total / cant;

  const nuevoLote = {
    id: 'lote_' + uid(),
    fecha,
    unidadesCompradas: cant,
    costoTotalCompra: total,
    costoUnitario: costoU,
    proveedorId: _rpProvId || null
  };

  if(!Array.isArray(p.lotes)) p.lotes = [];
  p.lotes.push(nuevoLote);

  /* Auto-vincular al proveedor */
  if(_rpProvId){
    const prov = (window.DB.suppliers || []).find(x => x.id === _rpProvId);
    if(prov){
      prov.productoIds = prov.productoIds || [];
      prov.productoIdsOcultos = prov.productoIdsOcultos || [];
      if(!prov.productoIds.includes(p.id)) prov.productoIds.push(p.id);
      prov.productoIdsOcultos = prov.productoIdsOcultos.filter(x => x !== p.id);
    }
  }

  saveDB();
  renderRestockPage();
  if(typeof renderAll === 'function') renderAll();

  document.querySelector('#m-restock-item')?.remove();
  _rpItemId = null;
  _rpProvId = null;

  const provMsg = _rpProvId ? '' : '';
  toast(`✅ ${fmtCantidadUnidad(cant, p.unidad || 'unidad')} de ${p.nombre}`);
  if(navigator.vibrate) navigator.vibrate(20);
}

/* ═══════════════════════════════════════════
   EXPORTAR LISTA DE COMPRAS
   ═══════════════════════════════════════════ */
async function exportarListaCompras(){
  if(typeof window.jspdf === 'undefined'){
    toast('⚠️ Generador PDF no cargado');
    return;
  }

  const todos = (window.DB.products || []).filter(p => {
    const t = tipoDe(p);
    return t === 'producto' || t === 'material';
  });

  const bajos = todos.filter(p => {
    const c = calc(p);
    return c.estadoStock === 'urgente' || c.estadoStock === 'agotado' || c.estadoStock === 'atencion';
  });

  if(!bajos.length) return toast('⚠️ No hay ítems con stock bajo');

  /* Ordenar: más bajo primero */
  bajos.sort((a, b) => {
    const ca = calc(a);
    const cb = calc(b);
    const pa = { agotado:0, urgente:1, atencion:2, ok:3 }[ca.estadoStock] || 4;
    const pb = { agotado:0, urgente:1, atencion:2, ok:3 }[cb.estadoStock] || 4;
    if(pa !== pb) return pa - pb;
    return a.nombre.localeCompare(b.nombre, 'es');
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15;

  const VERDE = [34, 197, 94];
  const NEGRO = [26, 26, 26];
  const GRIS  = [130, 130, 130];
  const GRIS2 = [245, 246, 248];
  const BLANCO = [255, 255, 255];
  const ROJO  = [239, 68, 68];
  const AMBER = [245, 158, 11];

  const negocio = window.DB.settings.business || {};
  const nombreNegocio = negocio.nombre || 'Mi negocio';
  const fecha = new Date().toLocaleDateString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  /* HEADER */
  doc.setFillColor(...VERDE);
  doc.rect(0, 0, W, 22, 'F');

  doc.setTextColor(...BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Stoki', M, 14);

  doc.setFontSize(14);
  doc.text('Lista de compras', W - M, 14, { align: 'right' });

  doc.setTextColor(...NEGRO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(nombreNegocio, M, 32);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  doc.setFontSize(9);
  doc.text(`${fecha} · ${bajos.length} ítem${bajos.length !== 1 ? 's' : ''}`, W - M, 32, { align: 'right' });

  let y = 44;

  /* TABLA */
  doc.setFillColor(...VERDE);
  doc.rect(M, y, W - 2 * M, 8, 'F');

  doc.setTextColor(...BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('COMPRAR', M + 3, y + 5.5);
  doc.text('PRODUCTO', M + 22, y + 5.5);
  doc.text('STOCK', W - M - 60, y + 5.5, { align: 'center' });
  doc.text('ÚLTIMO PAGO', W - M - 3, y + 5.5, { align: 'right' });

  y += 8;

  bajos.forEach((p, idx) => {
    if(y > H - 25){
      doc.addPage();
      y = 20;

      doc.setFillColor(...VERDE);
      doc.rect(M, y, W - 2 * M, 8, 'F');
      doc.setTextColor(...BLANCO);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('COMPRAR', M + 3, y + 5.5);
      doc.text('PRODUCTO', M + 22, y + 5.5);
      doc.text('STOCK', W - M - 60, y + 5.5, { align: 'center' });
      doc.text('ÚLTIMO PAGO', W - M - 3, y + 5.5, { align: 'right' });
      y += 8;
    }

    if(idx % 2 === 0){
      doc.setFillColor(250, 250, 250);
      doc.rect(M, y, W - 2 * M, 8, 'F');
    }

    /* Checkbox */
    doc.setDrawColor(...GRIS);
    doc.setLineWidth(0.3);
    doc.rect(M + 3, y + 1.5, 5, 5, 'S');

    /* Nombre */
    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const nombreCorto = p.nombre.length > 40 ? p.nombre.slice(0, 40) + '…' : p.nombre;
    doc.text(nombreCorto, M + 22, y + 5.5);

    /* Stock */
    const c = calc(p);
    const u = unidadInfo(p.unidad || 'unidad');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const colorStock = c.estadoStock === 'agotado' ? ROJO : c.estadoStock === 'urgente' ? ROJO : AMBER;
    doc.setTextColor(...colorStock);
    const stockTxt = fmtCantidadUnidad(c.stock, p.unidad || 'unidad');
    doc.text(stockTxt, W - M - 60, y + 5.5, { align: 'center' });

    /* Último pago */
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    const ultimoLote = (p.lotes || [])[p.lotes.length - 1];
    const ultimoPrecio = ultimoLote ? `${fmt(ultimoLote.costoUnitario)}/${u.abreviacion}` : '—';
    doc.text(ultimoPrecio, W - M - 3, y + 5.5, { align: 'right' });

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.1);
    doc.line(M, y + 8, W - M, y + 8);

    y += 8;
  });

  /* Nota al pie */
  if(y > H - 40){
    doc.addPage();
    y = 20;
  }

  y += 6;
  doc.setFillColor(...GRIS2);
  doc.roundedRect(M, y, W - 2 * M, 16, 3, 3, 'F');

  doc.setTextColor(...GRIS);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('Marcá cada ítem cuando lo compres y anotá el precio actual.', M + 6, y + 7);
  doc.text('Registralo en Stoki → Reabastecer.', M + 6, y + 13);

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

  const nombreArchivo = `ListaCompras-${todayISO()}.pdf`;
  previsualizarPDF(doc, nombreArchivo, 'Lista de compras');

  if(navigator.vibrate) navigator.vibrate(20);
}

/* =========================================================
   views/suppliers.js — PARTE 1/2
   Pestaña Proveedores + detalle con productos + botón Nuevo
   ========================================================= */

let supBusqueda = '';

function renderSuppliers(){
  const cont = document.querySelector('#v-suppliers');
  if(!cont) return;

  const suppliers = window.DB.suppliers || [];
  const toolbar = buildSuppliersToolbar();

  if(!suppliers.length){
    cont.innerHTML = toolbar + `
      <div class="empty">
        <div class="ico">🏭</div>
        <h3>Sin proveedores</h3>
        <p>Agregá proveedores para tener<br>sus datos y precios a mano.</p>
      </div>`;
    bindSuppliersEvents();
    return;
  }

  const filtrados = filterSuppliers();

  if(!filtrados.length){
    cont.innerHTML = toolbar + `
      <div class="empty">
        <div class="ico">🔍</div>
        <h3>Sin resultados</h3>
        <p>Ningún proveedor coincide con "${esc(supBusqueda)}"</p>
      </div>`;
    bindSuppliersEvents();
    return;
  }

  filtrados.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity:'base' })
  );

  cont.innerHTML = toolbar + `
    <div class="sup-list">
      ${filtrados.map(buildSupplierRow).join('')}
    </div>`;
  bindSuppliersEvents();
}

/* =========================================================
   TOOLBAR
   ========================================================= */
function buildSuppliersToolbar(){
  const filtrados = filterSuppliers().length;

  const contador = supBusqueda
    ? `<div class="inv-counter">${filtrados} resultado${filtrados !== 1 ? 's' : ''}</div>`
    : '';

  return `
    <div class="inv-toolbar">
      <button class="btn-nuevo-proveedor" id="sup-nuevo">
        ➕ Nuevo proveedor
      </button>

      <div class="inv-search" style="margin-top:10px">
        <input type="text"
               id="sup-search"
               placeholder="Buscar proveedor..."
               autocomplete="off"
               value="${esc(supBusqueda)}"
               style="padding-right:40px">
        ${supBusqueda ? '<button class="inv-search-clear" id="sup-search-clear">✕</button>' : ''}
      </div>
      ${contador}
    </div>`;
}

function filterSuppliers(){
  const q = normalize(supBusqueda);
  const suppliers = window.DB.suppliers || [];

  if(!q) return [...suppliers];

  return suppliers.filter(s =>
    normalize(s.nombre).includes(q) ||
    normalize(s.tienda || '').includes(q) ||
    normalize(s.telefono || '').includes(q)
  );
}

/* =========================================================
   FILA DE PROVEEDOR
   ========================================================= */
function buildSupplierRow(s){
  const productos = getProductosDelProveedor(s.id);
  const totalGastado = productos.reduce((sum, item) =>
    sum + (item.lotes.reduce((s2, l) => s2 + l.costoTotalCompra, 0)),
    0
  );

  const inicial = esc((s.nombre || '?').charAt(0).toUpperCase());

  const tiendaHTML = s.tienda
    ? `<div class="sup-tienda">🏪 ${esc(s.tienda)}</div>`
    : '';

  const meta = [];
  if(s.telefono) meta.push(esc(s.telefono));
  if(s.direccion) meta.push(esc(s.direccion));
  const metaHTML = meta.length
    ? `<div class="sup-meta">${meta.join(' · ')}</div>`
    : '';

  return `
    <div class="sup-row" data-sup="${s.id}">
      <div class="sup-avatar">${inicial}</div>
      <div class="sup-info">
        <div class="sup-nombre">${esc(s.nombre)}</div>
        ${tiendaHTML}
        ${metaHTML}
        <div class="sup-stats">
          ${productos.length} producto${productos.length !== 1 ? 's' : ''} · ${fmt(totalGastado)}
        </div>
      </div>
      <div class="sup-chevron">›</div>
    </div>`;
}

/* =========================================================
   HELPERS — PRODUCTOS DEL PROVEEDOR
   Une: array productoIds + lotes existentes − ocultos
   ========================================================= */
function getProductosDelProveedor(proveedorId){
  const prov = (window.DB.suppliers || []).find(x => x.id === proveedorId);
  if(!prov) return [];

  const ids = new Set();

  /* Desde el array del proveedor */
  (prov.productoIds || []).forEach(id => ids.add(id));

  /* Desde los lotes (compatibilidad con datos viejos) */
  (window.DB.products || []).forEach(p => {
    (p.lotes || []).forEach(l => {
      if(l.proveedorId === proveedorId) ids.add(p.id);
    });
  });

  /* Excluir los que el usuario marcó como ocultos */
  (prov.productoIdsOcultos || []).forEach(id => ids.delete(id));

  const result = [];

  ids.forEach(pid => {
    const p = (window.DB.products || []).find(x => x.id === pid);
    if(!p) return;

    const lotesProv = (p.lotes || []).filter(l => l.proveedorId === proveedorId);

    result.push({
      producto: p,
      lotes: lotesProv,
      ultimoCosto: lotesProv.length
        ? lotesProv[lotesProv.length - 1].costoUnitario
        : 0,
      sinCompras: lotesProv.length === 0
    });
  });

  return result;
}

/* =========================================================
   EVENTOS LISTA
   ========================================================= */
function bindSuppliersEvents(){
  const nuevoBtn = document.querySelector('#sup-nuevo');
  if(nuevoBtn){
    nuevoBtn.addEventListener('click', () => {
      if(typeof openSupplierNew === 'function') openSupplierNew();
    });
  }

  const input = document.querySelector('#sup-search');
  if(input){
    input.addEventListener('input', e => {
      supBusqueda = e.target.value;
      renderSuppliers();
      const nuevo = document.querySelector('#sup-search');
      if(nuevo){
        nuevo.focus();
        nuevo.setSelectionRange(supBusqueda.length, supBusqueda.length);
      }
    });
  }

  const clear = document.querySelector('#sup-search-clear');
  if(clear){
    clear.addEventListener('click', e => {
      e.stopPropagation();
      supBusqueda = '';
      renderSuppliers();
    });
  }

  document.querySelectorAll('.sup-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.sup;
      if(id) openSupplierDetail(id);
    });
  });
}

/* =========================================================
   DETALLE DEL PROVEEDOR
   ========================================================= */
function openSupplierDetail(supplierId){
  const s = (window.DB.suppliers || []).find(x => x.id === supplierId);
  if(!s){ toast('⚠️ Proveedor no encontrado'); return; }

  if(document.querySelector('#m-supplier')) return;

  const productos = getProductosDelProveedor(s.id);
  const totalGastado = productos.reduce((sum, item) =>
    sum + item.lotes.reduce((s2, l) => s2 + l.costoTotalCompra, 0),
    0
  );

  const contactoHTML = [];
  if(s.telefono) contactoHTML.push(`📞 ${esc(s.telefono)}`);
  if(s.direccion) contactoHTML.push(`📍 ${esc(s.direccion)}`);
  if(s.pais) contactoHTML.push(`🌎 ${esc(s.pais)}`);

  const contacto = contactoHTML.length
    ? `<div class="sup-detail-meta">${contactoHTML.join('<br>')}</div>`
    : '';

  const tiendaHTML = s.tienda
    ? `<div class="sup-detail-meta" style="color:#60a5fa;font-weight:800">🏪 ${esc(s.tienda)}</div>`
    : '';

  const notasHTML = s.notas
    ? `<div style="background:var(--bg3);border-radius:10px;padding:10px;
                   font-size:12px;color:var(--dim);margin-top:10px;
                   font-style:italic">📝 ${esc(s.notas)}</div>`
    : '';

  const html = `
    <div class="overlay centered open" id="m-supplier">
      <div class="sheet" style="position:relative">
        <button class="x" id="sup-close">✕</button>

        <div class="sup-detail-header">
          <div class="sup-avatar">
            ${esc((s.nombre || '?').charAt(0).toUpperCase())}
          </div>
          <h2 style="margin:12px 0 6px;text-align:center">${esc(s.nombre)}</h2>
          ${tiendaHTML}
          ${contacto}
          ${notasHTML}
        </div>

        <div class="sup-detail-kpis">
          <div class="kbox">
            <div class="k">Productos</div>
            <div class="v" id="sup-kpi-productos">${productos.length}</div>
          </div>
          <div class="kbox">
            <div class="k">Total comprado</div>
            <div class="v" id="sup-kpi-total">${fmt(totalGastado)}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;
                    align-items:center;margin:16px 0 10px">
          <div class="sup-products-title" style="margin:0">
            📦 Productos que vende
          </div>
          <button type="button" id="sup-add-product"
                  style="background:rgba(34,197,94,.12);
                         border:1px dashed var(--green);border-radius:8px;
                         padding:7px 12px;color:var(--green);
                         font-size:11px;font-weight:800;font-family:inherit;
                         cursor:pointer">
            ➕ Agregar
          </button>
        </div>

        <div class="sup-products" id="sup-products"></div>

        <button class="btn-whatsapp" id="sup-wa"
                ${!s.telefono ? 'disabled' : ''}>
          💬 Pedir por WhatsApp
        </button>

        <button class="btn-ghost" id="sup-edit">✏️ Editar proveedor</button>
        <button class="btn-ghost btn-danger" id="sup-del">Eliminar proveedor</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  renderSupProducts(supplierId);

  document.querySelector('#sup-close').addEventListener('click', closeSupplierDetail);
  document.querySelector('#m-supplier').addEventListener('click', e => {
    if(e.target.id === 'm-supplier') closeSupplierDetail();
  });

  document.querySelector('#sup-edit').addEventListener('click', () => {
    closeSupplierDetail();
    setTimeout(() => openSupplierEdit(supplierId), 200);
  });

  document.querySelector('#sup-del').addEventListener('click', () => {
    deleteSupplier(supplierId, s.nombre);
  });

  const waBtn = document.querySelector('#sup-wa');
  if(waBtn){
    waBtn.addEventListener('click', () => pedirPorWhatsApp(supplierId));
  }

  const addBtn = document.querySelector('#sup-add-product');
  if(addBtn){
    addBtn.addEventListener('click', () => openPickerProductoProveedor(supplierId));
  }
}

function closeSupplierDetail(){
  const el = document.querySelector('#m-supplier');
  if(el) el.remove();
}

/* =========================================================
   RENDER LISTA DE PRODUCTOS DEL PROVEEDOR
   (se usa al abrir y al agregar/quitar)
   ========================================================= */
function renderSupProducts(supplierId){
  const cont = document.querySelector('#sup-products');
  if(!cont) return;

  const productos = getProductosDelProveedor(supplierId);

  /* Actualizar KPIs */
  const kpiProd = document.querySelector('#sup-kpi-productos');
  if(kpiProd) kpiProd.textContent = productos.length;

  const totalGastado = productos.reduce((sum, item) =>
    sum + item.lotes.reduce((s2, l) => s2 + l.costoTotalCompra, 0), 0
  );
  const kpiTotal = document.querySelector('#sup-kpi-total');
  if(kpiTotal) kpiTotal.textContent = fmt(totalGastado);

  if(!productos.length){
    cont.innerHTML = `
      <div class="empty" style="padding:24px 10px">
        <div class="ico">📦</div>
        <h3>Sin productos</h3>
        <p>Tocá "➕ Agregar" para vincular<br>productos a este proveedor.</p>
      </div>`;
    return;
  }

  cont.innerHTML = productos.map(item => {
    const p = item.producto;
    const foto = getFotoPrincipal(p);
    const thumbStyle = foto
      ? `background-image:url('${foto}');background-size:cover;background-position:center;`
      : `background:var(--bg4);display:flex;align-items:center;justify-content:center;font-weight:900;color:var(--dim);`;

    const inicial = esc((p.nombre || '?').charAt(0).toUpperCase());
    const thumbContent = foto ? '' : inicial;

    const info = item.sinCompras
      ? `<span style="color:var(--dim)">Sin compras registradas</span>`
      : `Último: <b>${fmt(item.ultimoCosto)}</b>/u · ${item.lotes.length} lote${item.lotes.length !== 1 ? 's' : ''}`;

    return `
      <div class="sup-product-row" data-product-id="${p.id}">
        <input type="checkbox" class="sup-product-check"
               data-product-id="${p.id}" checked>
        <div style="width:36px;height:36px;border-radius:8px;
                    flex:0 0 auto;overflow:hidden;${thumbStyle}">
          ${thumbContent}
        </div>
        <div class="sup-product-info">
          <div class="sup-product-nombre">${esc(p.nombre)}</div>
          <div class="sup-product-precio">${info}</div>
        </div>
        <button type="button" class="sup-product-del"
                data-del-product="${p.id}"
                aria-label="Quitar"
                style="background:rgba(239,68,68,.14);color:var(--red);
                       border:0;border-radius:8px;width:32px;height:32px;
                       flex:0 0 auto;font-size:14px;cursor:pointer;
                       font-family:inherit;padding:0;display:flex;
                       align-items:center;justify-content:center">
          🗑️
        </button>
      </div>`;
  }).join('');

  /* Bind: quitar producto */
  cont.querySelectorAll('[data-del-product]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      quitarProductoDeProveedor(supplierId, btn.dataset.delProduct);
    });
  });
}
/* =========================================================
   views/suppliers.js — PARTE 2/2
   Crear/editar + WhatsApp + eliminar + picker productos
   ========================================================= */

/* =========================================================
   CREAR PROVEEDOR
   ========================================================= */
function openSupplierNew(){
  if(document.querySelector('#m-supplier-edit')) return;

  const html = `
    <div class="overlay centered open" id="m-supplier-edit">
      <div class="sheet" style="position:relative">
        <button class="x" id="spe-close">✕</button>
        <h2>🏭 Nuevo proveedor</h2>
        <div class="sub">Datos para contacto y pedidos.</div>

        <label>Nombre</label>
        <input id="spe-nombre" placeholder="Ej: Juan Pérez" autocomplete="off">

        <label>Tienda / Local <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span></label>
        <input id="spe-tienda" placeholder="Ej: Distribuidora El Sol" autocomplete="off">

        <label>Teléfono <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span></label>
        <input id="spe-telefono" type="tel" placeholder="Ej: 0412-1234567" autocomplete="off">

        <label>País (para WhatsApp)
          <span style="color:var(--dim);text-transform:none;font-weight:600">(ej: +58)</span>
        </label>
        <input id="spe-pais" placeholder="+58" autocomplete="off">

        <label>Dirección <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span></label>
        <input id="spe-direccion" placeholder="Ej: Av. Principal, Local 5" autocomplete="off">

        <label>Notas <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span></label>
        <input id="spe-notas" placeholder="Vende barato, entregas los martes..." autocomplete="off">

        <button class="btn-main" id="spe-save">Guardar proveedor</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#spe-close').addEventListener('click', () => {
    document.querySelector('#m-supplier-edit').remove();
  });

  document.querySelector('#spe-save').addEventListener('click', () => {
    const nombre = document.querySelector('#spe-nombre').value.trim();
    if(!nombre) return toast('⚠️ El nombre es obligatorio');

    const nuevo = {
      id: 'sup_' + uid(),
      nombre,
      tienda: document.querySelector('#spe-tienda').value.trim(),
      telefono: document.querySelector('#spe-telefono').value.trim(),
      pais: document.querySelector('#spe-pais').value.trim(),
      direccion: document.querySelector('#spe-direccion').value.trim(),
      notas: document.querySelector('#spe-notas').value.trim(),
      productoIds: [],
      productoIdsOcultos: [],
      creado: Date.now()
    };

    if(!window.DB.suppliers) window.DB.suppliers = [];
    window.DB.suppliers.push(nuevo);

    saveDB();
    document.querySelector('#m-supplier-edit').remove();
    renderSuppliers();
    toast('✅ Proveedor creado');
  });

  setTimeout(() => document.querySelector('#spe-nombre').focus(), 300);
}

/* =========================================================
   EDITAR PROVEEDOR
   ========================================================= */
function openSupplierEdit(supplierId){
  const s = (window.DB.suppliers || []).find(x => x.id === supplierId);
  if(!s) return;

  if(document.querySelector('#m-supplier-edit')) return;

  const html = `
    <div class="overlay centered open" id="m-supplier-edit">
      <div class="sheet" style="position:relative">
        <button class="x" id="spe-close">✕</button>
        <h2>✏️ Editar proveedor</h2>
        <div class="sub">Modificá los datos de contacto.</div>

        <label>Nombre</label>
        <input id="spe-nombre" value="${esc(s.nombre)}">

        <label>Tienda / Local</label>
        <input id="spe-tienda" value="${esc(s.tienda || '')}">

        <label>Teléfono</label>
        <input id="spe-telefono" type="tel" value="${esc(s.telefono || '')}">

        <label>País (para WhatsApp)</label>
        <input id="spe-pais" value="${esc(s.pais || '')}" placeholder="+58">

        <label>Dirección</label>
        <input id="spe-direccion" value="${esc(s.direccion || '')}">

        <label>Notas</label>
        <input id="spe-notas" value="${esc(s.notas || '')}">

        <button class="btn-main" id="spe-save">Guardar cambios</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#spe-close').addEventListener('click', () => {
    document.querySelector('#m-supplier-edit').remove();
  });

  document.querySelector('#spe-save').addEventListener('click', () => {
    const nombre = document.querySelector('#spe-nombre').value.trim();
    if(!nombre) return toast('⚠️ El nombre es obligatorio');

    s.nombre    = nombre;
    s.tienda    = document.querySelector('#spe-tienda').value.trim();
    s.telefono  = document.querySelector('#spe-telefono').value.trim();
    s.pais      = document.querySelector('#spe-pais').value.trim();
    s.direccion = document.querySelector('#spe-direccion').value.trim();
    s.notas     = document.querySelector('#spe-notas').value.trim();

    saveDB();
    document.querySelector('#m-supplier-edit').remove();
    renderSuppliers();
    toast('✅ Proveedor actualizado');
  });
}

/* =========================================================
   PEDIR POR WHATSAPP
   ========================================================= */
function pedirPorWhatsApp(supplierId){
  const s = (window.DB.suppliers || []).find(x => x.id === supplierId);
  if(!s) return;

  if(!s.telefono){
    toast('⚠️ Este proveedor no tiene teléfono');
    return;
  }

  const checks = [...document.querySelectorAll('.sup-product-check:checked')];

  if(!checks.length){
    toast('⚠️ Seleccioná al menos un producto');
    return;
  }

  const negocio = (window.DB.settings.business || {}).nombre || 'tu cliente';

  const lineas = checks.map(chk => {
    const pid = chk.dataset.productId;
    const p = window.DB.products.find(x => x.id === pid);
    if(!p) return '';
    return `- ${p.nombre}`;
  }).filter(Boolean);

  const mensaje = `Buenas, soy ${negocio}. Estoy interesado en:\n\n` +
                  lineas.join('\n') +
                  `\n\n¿Me mandás precios?`;

  const numero = limpiarTelefono(s.telefono, s.pais);

  if(!numero){
    toast('⚠️ Teléfono inválido');
    return;
  }

  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');

  toast('💬 Abriendo WhatsApp...');
}

/* Limpia el teléfono y le agrega el país */
function limpiarTelefono(tel, pais){
  if(!tel) return null;

  let limpio = tel.replace(/\D/g, '');

  if(limpio.startsWith('0')) limpio = limpio.slice(1);

  if(pais){
    const p = pais.replace(/\D/g, '');
    if(p && !limpio.startsWith(p)){
      limpio = p + limpio;
    }
  }

  return limpio || null;
}

/* =========================================================
   ELIMINAR PROVEEDOR
   ========================================================= */
async function deleteSupplier(supplierId, nombre){
  const productos = getProductosDelProveedor(supplierId);

  const mensaje = productos.length
    ? `Tiene ${productos.length} producto${productos.length !== 1 ? 's' : ''} asociado${productos.length !== 1 ? 's' : ''}.\nLos lotes NO se borran, solo pierden el proveedor.`
    : 'Esta acción no se puede deshacer.';

  const ok = await confirmarAccion({
    titulo: `¿Eliminar a "${nombre}"?`,
    mensaje,
    botonOk: 'Eliminar',
    botonCancel: 'Cancelar',
    colorOk: 'rojo'
  });

  if(!ok) return;

  window.DB.suppliers = (window.DB.suppliers || []).filter(x => x.id !== supplierId);

  (window.DB.products || []).forEach(p => {
    (p.lotes || []).forEach(l => {
      if(l.proveedorId === supplierId) l.proveedorId = null;
    });
  });

  saveDB();
  closeSupplierDetail();
  renderSuppliers();
  toast('🗑️ Proveedor eliminado');
}

/* =========================================================
   AGREGAR / QUITAR PRODUCTOS DEL PROVEEDOR
   ========================================================= */

/* ---------- Quitar ---------- */
async function quitarProductoDeProveedor(supplierId, productoId){
  const s = (window.DB.suppliers || []).find(x => x.id === supplierId);
  if(!s) return;

  const p = (window.DB.products || []).find(x => x.id === productoId);
  const nombre = p ? p.nombre : 'este producto';

  const tieneLotes = (p && (p.lotes || []).some(l => l.proveedorId === supplierId));

  const mensaje = tieneLotes
    ? 'El producto tiene compras registradas.\nSe ocultará del listado pero las compras siguen guardadas.'
    : 'Se quitará de la lista de productos de este proveedor.';

  const ok = await confirmarAccion({
    titulo: `¿Quitar "${nombre}"?`,
    mensaje,
    botonOk: 'Quitar',
    botonCancel: 'Cancelar',
    colorOk: 'rojo'
  });

  if(!ok) return;

  s.productoIds = (s.productoIds || []).filter(x => x !== productoId);

  if(tieneLotes){
    s.productoIdsOcultos = s.productoIdsOcultos || [];
    if(!s.productoIdsOcultos.includes(productoId)){
      s.productoIdsOcultos.push(productoId);
    }
  }

  saveDB();
  renderSupProducts(supplierId);
  renderSuppliers();  /* Refresca contador de la lista */

  if(navigator.vibrate) navigator.vibrate(15);
  toast('🗑️ Producto quitado');
}

/* ---------- Picker para agregar ---------- */
function openPickerProductoProveedor(supplierId){
  if(document.querySelector('#m-sup-picker')) return;

  const html = `
    <div class="overlay centered open" id="m-sup-picker">
      <div class="sheet" style="position:relative">
        <button class="x" id="sup-picker-close">✕</button>
        <h2>Agregar producto</h2>
        <div class="sub">Elegí qué productos vende este proveedor</div>

        <div class="inv-search" style="margin-top:10px">
          <input type="text"
                 id="sup-picker-input"
                 placeholder="Buscar producto..."
                 autocomplete="off"
                 style="padding-right:12px">
        </div>

        <div id="sup-picker-list" class="picker-list"></div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  renderPickerProductoProveedor(supplierId);

  document.querySelector('#sup-picker-close').addEventListener('click', () => {
    document.querySelector('#m-sup-picker').remove();
  });

  document.querySelector('#sup-picker-input').addEventListener('input', () => {
    renderPickerProductoProveedor(supplierId);
  });

  document.querySelector('#m-sup-picker').addEventListener('click', e => {
    if(e.target.id === 'm-sup-picker') e.target.remove();
  });

  setTimeout(() => {
    const inp = document.querySelector('#sup-picker-input');
    if(inp) inp.focus();
  }, 250);
}

function renderPickerProductoProveedor(supplierId){
  const cont = document.querySelector('#sup-picker-list');
  const input = document.querySelector('#sup-picker-input');
  if(!cont) return;

  const s = (window.DB.suppliers || []).find(x => x.id === supplierId);
  if(!s) return;

  /* Ya vinculados (para excluirlos) */
  const yaVinculados = new Set(getProductosDelProveedor(supplierId).map(item => item.producto.id));

  const q = normalize(input ? input.value : '');

  let lista = [...(window.DB.products || [])];

  if(q){
    lista = lista.filter(p => normalize(p.nombre).includes(q));
  }

  /* Excluir los ya vinculados */
  lista = lista.filter(p => !yaVinculados.has(p.id));

  if(!lista.length){
    cont.innerHTML = `
      <div class="empty" style="padding:30px 10px">
        <div class="ico">📦</div>
        <h3>Sin productos</h3>
        <p>${q ? 'Ninguno coincide' : 'Ya están todos vinculados'}</p>
      </div>`;
    return;
  }

  lista.sort((a, b) => {
    if(a.favorito && !b.favorito) return -1;
    if(!a.favorito && b.favorito) return 1;
    return a.nombre.localeCompare(b.nombre, 'es', { sensitivity:'base' });
  });

  cont.innerHTML = lista.map(p => {
    const c = calc(p);
    const thumb = buildThumb(p, 44);
    const corazon = p.favorito ? '❤️ ' : '';

    return `
      <div class="picker-item" data-id="${p.id}">
        ${thumb}
        <div class="picker-info">
          <div class="picker-name">${corazon}${esc(p.nombre)}</div>
          <div class="picker-meta">${fmt(c.precioVenta)} · ${c.stock} disp.</div>
        </div>
      </div>`;
  }).join('');

  cont.querySelectorAll('.picker-item').forEach(el => {
    el.addEventListener('click', () => {
      agregarProductoAProveedor(supplierId, el.dataset.id);
    });
  });
}

function agregarProductoAProveedor(supplierId, productoId){
  const s = (window.DB.suppliers || []).find(x => x.id === supplierId);
  const p = (window.DB.products || []).find(x => x.id === productoId);
  if(!s || !p) return;

  s.productoIds = s.productoIds || [];
  s.productoIdsOcultos = s.productoIdsOcultos || [];

  /* Agregar */
  if(!s.productoIds.includes(productoId)){
    s.productoIds.push(productoId);
  }

  /* Des-ocultar si estaba oculto */
  s.productoIdsOcultos = s.productoIdsOcultos.filter(x => x !== productoId);

  saveDB();

  /* Refrescar picker (para que desaparezca el que acabás de agregar) */
  renderPickerProductoProveedor(supplierId);

  /* Refrescar lista de productos del proveedor */
  renderSupProducts(supplierId);
  renderSuppliers();

  if(navigator.vibrate) navigator.vibrate(15);
  toast(`✅ ${p.nombre} agregado`);
}
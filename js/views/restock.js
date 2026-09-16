/* =========================================================
   views/restock.js — Modal reabastecer
   + Selector de proveedores (relevantes o todos)
   + Crear proveedor inline
   + Auto-vincula producto al proveedor al guardar
   ========================================================= */

let restockProductId = null;
let restockProveedorId = null;

/* ---------- Abrir modal ---------- */
function openRestock(id){
  const p = window.DB.products.find(x => x.id === id);
  if(!p) return;

  if(p.restockeable === false){
    toast('🔒 Este producto es único, no admite restock');
    return;
  }

  restockProductId = id;
  restockProveedorId = null;

  const c = calc(p);

  $('#restock-title').textContent = `Reabastecer: ${p.nombre}`;
  $('#restock-sub').innerHTML =
    `Stock actual: <b>${c.stock}</b> unidades · ` +
    `Precio venta: <b>${fmt(c.precioVenta)}</b>`;

  $('#r-unidades').value = '';
  $('#r-total').value    = '';
  $('#r-unit').value     = '';
  $('#r-fecha').value    = todayISO();

  renderRestockHistory(c);
  renderRestockProveedores();
  updateRestockPreview();
  openModal('#m-restock');
}

/* =========================================================
   SELECTOR DE PROVEEDORES
   - Relevantes: los que tienen el producto en productoIds
     O los que ya le compraste (lotes con su proveedorId)
   - Excluye los que el usuario ocultó (productoIdsOcultos)
   - Si no hay relevantes: muestra TODOS (alfabético)
   - En ambos: botón ➕ Nuevo proveedor
   ========================================================= */
function renderRestockProveedores(){
  const cont = document.querySelector('#restock-proveedores');
  if(!cont) return;

  const p = window.DB.products.find(x => x.id === restockProductId);
  if(!p) return;

  const todos = window.DB.suppliers || [];

  /* Recolectar proveedores relevantes */
  const relevantesSet = new Set();

  todos.forEach(prov => {
    const enArray = (prov.productoIds || []).includes(p.id);
    const enLotes = (p.lotes || []).some(l => l.proveedorId === prov.id);
    const oculto  = (prov.productoIdsOcultos || []).includes(p.id);

    if(oculto) return;
    if(enArray || enLotes) relevantesSet.add(prov.id);
  });

  const tieneRelevantes = relevantesSet.size > 0;

  /* ---------- Caso: sin proveedores guardados en la app ---------- */
  if(!tieneRelevantes && !todos.length){
    cont.innerHTML = `
      <label>📦 Proveedor
        <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span>
      </label>

      <div style="background:var(--bg3);border-radius:12px;
                  padding:14px;font-size:12px;color:var(--dim);
                  font-weight:700;margin-bottom:10px;text-align:center">
        Todavía no tenés proveedores guardados
      </div>

      <button type="button" id="restock-prov-new"
              style="width:100%;background:rgba(34,197,94,.12);
                     border:1px dashed var(--green);border-radius:10px;
                     padding:12px;color:var(--green);font-size:13px;
                     font-weight:800;font-family:inherit;cursor:pointer;
                     margin-bottom:14px">
        ➕ Nuevo proveedor
      </button>

      <div id="restock-prov-form-wrap"></div>
    `;
    bindRestockProvNew();
    return;
  }

  /* ---------- Construir lista ---------- */
  let proveedores = [];
  let titulo = '';
  let esRelevante = false;

  if(tieneRelevantes){
    esRelevante = true;
    titulo = '📦 ¿A quién le comprás?';

    proveedores = [...relevantesSet].map(pid => {
      const prov = todos.find(x => x.id === pid);
      if(!prov) return null;

      const lotesProv = (p.lotes || []).filter(l => l.proveedorId === pid);
      const ultimo = lotesProv[lotesProv.length - 1];

      return {
        proveedor: prov,
        ultimoPrecio: ultimo ? ultimo.costoUnitario : 0,
        totalLotes: lotesProv.length
      };
    }).filter(Boolean);

    /* Ordenar: primero los que tienen precio (más barato primero),
       después los que solo están vinculados (sin compras) */
    proveedores.sort((a, b) => {
      if(a.ultimoPrecio > 0 && b.ultimoPrecio === 0) return -1;
      if(a.ultimoPrecio === 0 && b.ultimoPrecio > 0) return 1;
      if(a.ultimoPrecio > 0 && b.ultimoPrecio > 0){
        return a.ultimoPrecio - b.ultimoPrecio;
      }
      return a.proveedor.nombre.localeCompare(b.proveedor.nombre, 'es', { sensitivity:'base' });
    });

  } else {
    titulo = '📦 Proveedor ' +
             '<span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span>';

    proveedores = todos.map(prov => ({
      proveedor: prov,
      ultimoPrecio: 0,
      totalLotes: 0
    }));

    proveedores.sort((a, b) =>
      a.proveedor.nombre.localeCompare(b.proveedor.nombre, 'es', { sensitivity:'base' })
    );
  }

  /* ---------- Filas ---------- */
  const items = proveedores.map((item, idx) => {
    const tienePrecio = item.ultimoPrecio > 0;
    const esMejor = esRelevante && idx === 0 && tienePrecio;
    const inicial = esc((item.proveedor.nombre || '?').charAt(0).toUpperCase());
    const precio = item.ultimoPrecio;

    let precioHTML;
    if(tienePrecio){
      precioHTML = `
        <div style="font-size:14px;font-weight:900;
                    color:${esMejor ? 'var(--green)' : 'var(--txt)'};
                    font-variant-numeric:tabular-nums">
          ${fmt(precio)}
        </div>
        <div style="font-size:10px;color:var(--dim);font-weight:700">último /u</div>`;
    } else {
      precioHTML = `
        <div style="font-size:11px;color:var(--dim);font-weight:700">
          Sin compras aún
        </div>`;
    }

    let meta;
    if(tienePrecio){
      meta = `${item.totalLotes} lote${item.totalLotes !== 1 ? 's' : ''}${item.proveedor.tienda ? ` · ${esc(item.proveedor.tienda)}` : ''}`;
    } else {
      meta = item.proveedor.tienda
        ? `Vende este producto · ${esc(item.proveedor.tienda)}`
        : 'Vende este producto';
    }

    return `
      <div class="restock-prov-row" data-prov="${item.proveedor.id}"
           data-precio="${precio}"
           style="display:flex;align-items:center;gap:10px;padding:10px;
                  background:var(--bg3);border-radius:10px;margin-bottom:6px;
                  cursor:pointer;${esMejor ? 'border:1px solid var(--green);' : ''}">
        <div style="width:36px;height:36px;border-radius:50%;
                    background:linear-gradient(135deg,#3b82f6,#2563eb);
                    color:#fff;display:flex;align-items:center;
                    justify-content:center;font-size:14px;font-weight:900;
                    flex:0 0 auto">
          ${inicial}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:800;color:var(--txt);
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${esMejor ? '✅ ' : ''}${esc(item.proveedor.nombre)}
          </div>
          <div style="font-size:11px;color:var(--dim);font-weight:600">
            ${meta}
          </div>
        </div>
        <div style="text-align:right;flex:0 0 auto">
          ${precioHTML}
        </div>
      </div>`;
  }).join('');

  cont.innerHTML = `
    <label>${titulo}</label>

    <div id="restock-prov-list" style="margin-bottom:8px">
      ${items}
    </div>

    <button type="button" id="restock-prov-new"
            style="width:100%;background:rgba(34,197,94,.12);
                   border:1px dashed var(--green);border-radius:10px;
                   padding:12px;color:var(--green);font-size:13px;
                   font-weight:800;font-family:inherit;cursor:pointer;
                   margin-bottom:8px">
      ➕ Nuevo proveedor
    </button>

    <button type="button" id="restock-prov-skip"
            style="width:100%;background:var(--bg3);border:1px dashed var(--line);
                   border-radius:10px;padding:11px;color:var(--dim);
                   font-size:12px;font-weight:800;font-family:inherit;
                   cursor:pointer;margin-bottom:14px">
      Saltar → continuar sin asignar
    </button>

    <div id="restock-prov-form-wrap"></div>
  `;

  /* Bind: elegir proveedor */
  cont.querySelectorAll('.restock-prov-row').forEach(row => {
    row.addEventListener('click', () => {
      restockProveedorId = row.dataset.prov;

      cont.querySelectorAll('.restock-prov-row').forEach(r => {
        r.style.border = 'none';
        r.style.background = 'var(--bg3)';
      });
      row.style.border = '2px solid var(--green)';
      row.style.background = 'var(--bg4)';

      const prov = todos.find(x => x.id === restockProveedorId);
      if(prov) toast(`✅ Asignado: ${prov.nombre}`);
    });
  });

  /* Bind: saltar */
  const skipBtn = document.querySelector('#restock-prov-skip');
  if(skipBtn){
    skipBtn.addEventListener('click', () => {
      restockProveedorId = null;
      cont.querySelectorAll('.restock-prov-row').forEach(r => {
        r.style.border = 'none';
        r.style.background = 'var(--bg3)';
      });
      toast('Sin proveedor asignado');
    });
  }

  bindRestockProvNew();
}

/* =========================================================
   FORM INLINE: NUEVO PROVEEDOR
   ========================================================= */
function bindRestockProvNew(){
  const btnNew = document.querySelector('#restock-prov-new');
  if(btnNew){
    btnNew.addEventListener('click', mostrarFormNuevoProveedorRestock);
  }
}

function mostrarFormNuevoProveedorRestock(){
  const wrap = document.querySelector('#restock-prov-form-wrap');
  if(!wrap) return;

  if(wrap.dataset.abierto === '1'){
    wrap.innerHTML = '';
    wrap.dataset.abierto = '0';
    return;
  }

  wrap.dataset.abierto = '1';

  wrap.innerHTML = `
    <div class="cli-form" style="margin-top:6px">
      <label style="margin-top:0">Nombre</label>
      <input id="rnp-nombre" placeholder="Ej: Juan Pérez" autocomplete="off">

      <label>Tienda / Local
        <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span>
      </label>
      <input id="rnp-tienda" placeholder="Ej: Distribuidora El Sol" autocomplete="off">

      <label>Teléfono
        <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span>
      </label>
      <input id="rnp-telefono" type="tel" placeholder="Ej: 0412-1234567" autocomplete="off">

      <label>País
        <span style="color:var(--dim);text-transform:none;font-weight:600">(para WhatsApp)</span>
      </label>
      <input id="rnp-pais" placeholder="+58" autocomplete="off">

      <div style="display:flex;gap:8px;margin-top:14px">
        <button type="button" class="btn-ghost" id="rnp-cancel"
                style="margin-top:0;flex:1">
          Cancelar
        </button>
        <button type="button" class="btn-main" id="rnp-save"
                style="margin-top:0;flex:1">
          Guardar
        </button>
      </div>
    </div>
  `;

  const nombreInput = document.querySelector('#rnp-nombre');
  if(nombreInput) setTimeout(() => nombreInput.focus(), 150);

  document.querySelector('#rnp-cancel').addEventListener('click', () => {
    wrap.innerHTML = '';
    wrap.dataset.abierto = '0';
  });

  document.querySelector('#rnp-save').addEventListener('click', guardarNuevoProveedorRestock);
}

function guardarNuevoProveedorRestock(){
  const nombre = document.querySelector('#rnp-nombre').value.trim();
  if(!nombre) return toast('⚠️ El nombre es obligatorio');

  const nuevo = {
    id: 'sup_' + uid(),
    nombre,
    tienda:    document.querySelector('#rnp-tienda').value.trim(),
    telefono:  document.querySelector('#rnp-telefono').value.trim(),
    pais:      document.querySelector('#rnp-pais').value.trim(),
    direccion: '',
    notas:     '',
    productoIds: [],
    productoIdsOcultos: [],
    creado: Date.now()
  };

  if(!window.DB.suppliers) window.DB.suppliers = [];
  window.DB.suppliers.push(nuevo);
  saveDB();

  /* Auto-seleccionar el nuevo proveedor */
  restockProveedorId = nuevo.id;

  /* Re-renderizar la lista */
  renderRestockProveedores();

  /* Marcar visualmente el nuevo */
  setTimeout(() => {
    document.querySelectorAll('.restock-prov-row').forEach(r => {
      r.style.border = 'none';
      r.style.background = 'var(--bg3)';
      if(r.dataset.prov === nuevo.id){
        r.style.border = '2px solid var(--green)';
        r.style.background = 'var(--bg4)';
        r.scrollIntoView({ behavior:'smooth', block:'nearest' });
      }
    });
  }, 60);

  if(navigator.vibrate) navigator.vibrate(15);
  toast(`✅ Proveedor creado: ${nombre}`);
}

/* =========================================================
   COMPARATIVA HISTÓRICA
   ========================================================= */
function renderRestockHistory(c){
  const cont = $('#restock-history');
  if(!cont) return;

  if(c.lotes.length < 2){
    cont.innerHTML = `
      <div class="restock-history-item">
        <span class="label">Primer lote</span>
        <span class="value">${fmt(c.costoU)}/u</span>
      </div>
      <div class="restock-history-item">
        <span class="label" style="font-size:11px">
          Este será tu segundo lote
        </span>
        <span class="value" style="font-size:11px">—</span>
      </div>`;
    return;
  }

  const precioVenta = c.precioVenta;
  const margenDe = (costo) => {
    if(!costo || costo <= 0) return 0;
    return ((precioVenta - costo) / costo) * 100;
  };

  const margenMejor = margenDe(c.mejorPrecio.precio);
  const margenPeor  = margenDe(c.peorPrecio.precio);

  cont.innerHTML = `
    <div class="restock-history-item">
      <span class="label">✅ Mejor precio</span>
      <span class="value" style="color:var(--green)">
        ${fmt(c.mejorPrecio.precio)}/u
        <div style="font-size:11px;color:var(--dim);font-weight:600">
          Margen: ${margenMejor.toFixed(0)}%
        </div>
      </span>
    </div>
    <div class="restock-history-item">
      <span class="label">⚠️ Peor precio</span>
      <span class="value" style="color:var(--red)">
        ${fmt(c.peorPrecio.precio)}/u
        <div style="font-size:11px;color:var(--dim);font-weight:600">
          Margen: ${margenPeor.toFixed(0)}%
        </div>
      </span>
    </div>
    <div class="restock-history-item">
      <span class="label">📈 Promedio</span>
      <span class="value">
        ${fmt(c.precioPromedio)}/u
        <div style="font-size:11px;color:var(--dim);font-weight:600">
          Margen: ${margenDe(c.precioPromedio).toFixed(0)}%
        </div>
      </span>
    </div>`;
}

/* =========================================================
   PREVIEW EN VIVO
   ========================================================= */
function updateRestockPreview(){
  const p = window.DB.products.find(x => x.id === restockProductId);
  if(!p) return;

  const c = calc(p);
  const uNuevas = +$('#r-unidades').value || 0;
  const total   = +$('#r-total').value    || 0;
  const costoNuevoU = uNuevas > 0 ? total / uNuevas : 0;

  const valor = Number(p.valorMargen) || 0;
  const unidadesMargen = Number(p.unidadesMargen) || 0;
  let nuevoPrecio = costoNuevoU;

  switch(p.tipoMargen){
    case 'porcentaje':  nuevoPrecio = costoNuevoU * (1 + valor / 100); break;
    case 'fijo':        nuevoPrecio = costoNuevoU + valor; break;
    case 'fijo-lote':   nuevoPrecio = costoNuevoU + (unidadesMargen > 0 ? valor / unidadesMargen : 0); break;
    case 'precio':      nuevoPrecio = valor; break;
    case 'precio-lote': nuevoPrecio = unidadesMargen > 0 ? valor / unidadesMargen : 0; break;
    default:            nuevoPrecio = costoNuevoU * (1 + valor / 100);
  }

  const margenReal = costoNuevoU > 0
    ? ((nuevoPrecio - costoNuevoU) / costoNuevoU) * 100
    : 0;

  const stockFuturo = c.stock + uNuevas;

  $('#r-preview').innerHTML = `
    <div class="line">
      <span>Costo por unidad (nuevo lote)</span>
      <b>${fmt(costoNuevoU)}</b>
    </div>
    <div class="line">
      <span>Precio de venta nuevo</span>
      <b style="color:var(--green)">${fmt(nuevoPrecio)}</b>
    </div>
    <div class="line">
      <span>Margen aplicado</span>
      <b>${margenReal.toFixed(0)}%</b>
    </div>
    <div class="div"></div>
    <div class="line">
      <span>Stock después</span>
      <b>${stockFuturo} unidades</b>
    </div>`;

  const alerta = $('#restock-alert');
  if(!alerta) return;

  if(uNuevas > 0 && total > 0 && c.lotes.length >= 1){
    if(c.peorPrecio && costoNuevoU > c.peorPrecio.precio){
      alerta.className = 'restock-alert show';
      alerta.textContent = '⚠️ Es tu compra más cara hasta ahora';
    } else if(c.mejorPrecio && costoNuevoU < c.mejorPrecio.precio){
      alerta.className = 'restock-alert show bueno';
      alerta.textContent = '🎉 ¡Buena compra! Es tu mejor precio';
    } else {
      alerta.className = 'restock-alert';
      alerta.textContent = '';
    }
  } else {
    alerta.className = 'restock-alert';
    alerta.textContent = '';
  }
}

/* =========================================================
   GUARDAR RESTOCK
   ========================================================= */
function guardarRestock(){
  const p = window.DB.products.find(x => x.id === restockProductId);
  if(!p) return;

  if(p.restockeable === false){
    return toast('🔒 Este producto es único');
  }

  const uNuevas = +$('#r-unidades').value || 0;
  const total   = +$('#r-total').value    || 0;

  if(uNuevas <= 0) return toast('⚠️ Indica cuántas unidades');
  if(total <= 0)   return toast('⚠️ Indica el costo de compra');

  const costoU = total / uNuevas;
  const fecha  = $('#r-fecha').value || todayISO();

  const nuevoLote = {
    id: 'lote_' + uid(),
    fecha,
    unidadesCompradas: uNuevas,
    costoTotalCompra: total,
    costoUnitario: costoU,
    proveedorId: restockProveedorId
  };

  if(!p.lotes) p.lotes = [];
  p.lotes.push(nuevoLote);

  /* Auto-vincular producto al proveedor */
  if(restockProveedorId){
    const prov = (window.DB.suppliers || []).find(x => x.id === restockProveedorId);
    if(prov){
      prov.productoIds = prov.productoIds || [];
      prov.productoIdsOcultos = prov.productoIdsOcultos || [];

      if(!prov.productoIds.includes(p.id)){
        prov.productoIds.push(p.id);
      }

      /* Des-ocultar si estaba oculto */
      prov.productoIdsOcultos = prov.productoIdsOcultos.filter(x => x !== p.id);
    }
  }

  saveDB();
  renderAll();
  closeModal('#m-restock');

  const provMsg = restockProveedorId ? ' · proveedor asignado' : '';
  toast(`✅ ${uNuevas} unidades agregadas${provMsg}`);

  restockProveedorId = null;
}

/* =========================================================
   INIT
   ========================================================= */
function initRestock(){
  ['#r-unidades', '#r-total'].forEach(sel =>
    $(sel).addEventListener('input', updateRestockPreview)
  );

  $('#r-total').addEventListener('input', () => {
    const u = +$('#r-unidades').value || 0;
    const t = +$('#r-total').value    || 0;
    if(u > 0) $('#r-unit').value = (t / u).toFixed(2);
  });

  $('#r-unit').addEventListener('input', () => {
    const u  = +$('#r-unidades').value || 0;
    const un = +$('#r-unit').value    || 0;
    if(u > 0) $('#r-total').value = (u * un).toFixed(2);
    updateRestockPreview();
  });

  $('#r-save').addEventListener('click', guardarRestock);
}
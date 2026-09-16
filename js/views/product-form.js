/* =========================================================
   views/product-form.js — PARTE 1/2
   Fotos en IndexedDB (v11)
   ========================================================= */

let nuevaFotos    = [];
let fotoPrincipal = 0;
let tipoMargen    = 'porcentaje';
let margenScope   = 'unidad';
let editandoProductoId = null;

const MAX_FOTOS = 6;
const TAM_PRINCIPAL = 420;
const CAL_PRINCIPAL = 0.72;
const TAM_SECUNDARIA = 320;
const CAL_SECUNDARIA = 0.65;

function openAddForm(){
  editandoProductoId = null;
  resetAddForm();

  $('#f-title').textContent = 'Nuevo producto';
  $('#f-sub').textContent   = 'Registra tu compra y la app calcula el precio de venta.';
  $('#f-save').textContent  = 'Guardar producto';

  $$('.solo-nuevo').forEach(el => el.style.display = '');

  openModal('#m-add');
}

function openEditForm(id){
  const p = window.DB.products.find(x => x.id === id);
  if(!p) return;

  editandoProductoId = id;

  nuevaFotos    = [...getFotosProducto(p)];
  fotoPrincipal = p.fotoPrincipal || 0;

  let tipoBtn = 'porcentaje';
  let scope = 'unidad';

  if(p.tipoMargen === 'fijo') { tipoBtn = 'fijo'; scope = 'unidad'; }
  else if(p.tipoMargen === 'fijo-lote') { tipoBtn = 'fijo'; scope = 'lote'; }
  else if(p.tipoMargen === 'precio') { tipoBtn = 'precio'; scope = 'unidad'; }
  else if(p.tipoMargen === 'precio-lote') { tipoBtn = 'precio'; scope = 'lote'; }

  tipoMargen = tipoBtn;
  margenScope = scope;

  $('#f-nombre').value  = p.nombre || '';
  $('#f-codigo').value  = p.codigoBarras || '';
  $('#f-margen').value  = p.valorMargen || 0;
  $('#f-fecha').value   = todayISO();

  const checkRestock = $('#f-restockeable');
  if(checkRestock) checkRestock.checked = p.restockeable !== false;

  $('#f-seg').querySelectorAll('button').forEach(b =>
    b.classList.toggle('active', b.dataset.tipo === tipoMargen)
  );

  const scopeEl = $('#f-scope');
  if(scopeEl){
    scopeEl.style.display = (tipoMargen === 'porcentaje') ? 'none' : 'flex';
    scopeEl.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.dataset.scope === margenScope)
    );
  }

  actualizarSegHint();
  actualizarPlaceholder();

  $$('.solo-nuevo').forEach(el => el.style.display = 'none');

  $('#f-title').textContent = 'Editar producto';
  $('#f-sub').textContent   = 'Modificá nombre, fotos, código o precio.';
  $('#f-save').textContent  = 'Guardar cambios';

  renderFotosGrid();
  updatePreview();
  openModal('#m-add');
}

function resetAddForm(){
  nuevaFotos = [];
  fotoPrincipal = 0;
  tipoMargen = 'porcentaje';
  margenScope = 'unidad';

  $('#f-nombre').value   = '';
  $('#f-codigo').value   = '';
  $('#f-unidades').value = '';
  $('#f-total').value    = '';
  $('#f-unit').value     = '';
  $('#f-margen').value   = '40';
  $('#f-fecha').value    = todayISO();

  const checkRestock = $('#f-restockeable');
  if(checkRestock) checkRestock.checked = true;

  $('#f-seg').querySelectorAll('button').forEach((b, i) =>
    b.classList.toggle('active', i === 0)
  );

  const scopeEl = $('#f-scope');
  if(scopeEl){
    scopeEl.style.display = 'none';
    scopeEl.querySelectorAll('button').forEach((b, i) =>
      b.classList.toggle('active', i === 0)
    );
  }

  actualizarSegHint();
  actualizarPlaceholder();

  renderFotosGrid();
  updatePreview();
}

function actualizarSegHint(){
  const el = $('#f-seg-hint');
  if(!el) return;
  const hints = {
    porcentaje: 'Porcentaje de ganancia sobre el costo',
    fijo:       'Cuánto querés ganar',
    precio:     'Precio de venta final'
  };
  el.textContent = hints[tipoMargen] || '';
}

function actualizarPlaceholder(){
  const el = $('#f-margen');
  if(!el) return;
  if(tipoMargen === 'porcentaje')      el.placeholder = '40';
  else if(tipoMargen === 'fijo')       el.placeholder = '1';
  else if(tipoMargen === 'precio')     el.placeholder = '15';
}

function renderFotosGrid(){
  const cont = $('#f-fotos-grid');
  if(!cont) return;

  cont.innerHTML = '';

  nuevaFotos.forEach((foto, idx) => {
    const esPrincipal = idx === fotoPrincipal;
    const div = document.createElement('div');
    div.className = 'foto-slot lleno';
    div.style.backgroundImage = `url('${foto}')`;
    div.innerHTML = `
      <button class="foto-slot-star ${esPrincipal ? 'activa' : ''}" type="button">${esPrincipal ? '⭐' : '☆'}</button>
      <button class="foto-slot-del" type="button">✕</button>
    `;

    div.querySelector('.foto-slot-star').addEventListener('click', e => {
      e.stopPropagation();
      marcarPrincipal(idx);
    });

    div.querySelector('.foto-slot-del').addEventListener('click', e => {
      e.stopPropagation();
      eliminarFoto(idx);
    });

    div.addEventListener('click', e => {
      if(e.target.closest('.foto-slot-del')) return;
      if(e.target.closest('.foto-slot-star')) return;
      marcarPrincipal(idx);
    });

    cont.appendChild(div);
  });

  if(nuevaFotos.length < MAX_FOTOS){
    const add = document.createElement('div');
    add.className = 'foto-slot vacio';
    add.textContent = '+';
    add.addEventListener('click', abrirSelectorFoto);
    cont.appendChild(add);
  }

  const cnt = $('#f-fotos-count');
  if(cnt) cnt.textContent = `(${nuevaFotos.length}/${MAX_FOTOS})`;
}

async function marcarPrincipal(idx){
  if(idx < 0 || idx >= nuevaFotos.length) return;
  if(idx === fotoPrincipal) return;

  const anteriorIdx = fotoPrincipal;

  try{
    const nuevaPrincipal = await recomprimirBase64(nuevaFotos[idx], TAM_PRINCIPAL, CAL_PRINCIPAL);
    const anteriorBaja   = await recomprimirBase64(nuevaFotos[anteriorIdx], TAM_SECUNDARIA, CAL_SECUNDARIA);

    nuevaFotos[idx] = nuevaPrincipal;
    nuevaFotos[anteriorIdx] = anteriorBaja;
    fotoPrincipal = idx;

    renderFotosGrid();
    if(navigator.vibrate) navigator.vibrate(15);
    toast('⭐ Foto principal actualizada');
  }catch(e){
    console.error('Error al recomprimir:', e);
    fotoPrincipal = idx;
    renderFotosGrid();
  }
}

function recomprimirBase64(base64, max, quality){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const { width: w, height: h } = img;
      const scale = Math.min(1, max / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64;
  });
}

function eliminarFoto(idx){
  if(idx < 0 || idx >= nuevaFotos.length) return;
  nuevaFotos.splice(idx, 1);
  if(fotoPrincipal === idx){ fotoPrincipal = 0; }
  else if(fotoPrincipal > idx){ fotoPrincipal--; }
  if(!nuevaFotos.length) fotoPrincipal = 0;
  renderFotosGrid();
  if(navigator.vibrate) navigator.vibrate(10);
}

function abrirSelectorFoto(){
  const input = $('#f-file');
  input.removeAttribute('capture');
  input.multiple = nuevaFotos.length < MAX_FOTOS - 1;
  input.click();
}

async function procesarFotos(e){
  const files = [...e.target.files];
  if(!files.length) return;
  const espacio = MAX_FOTOS - nuevaFotos.length;
  const aProcesar = files.slice(0, espacio);

  for(const file of aProcesar){
    try{
      const seraIndex = nuevaFotos.length;
      const esPrincipal = seraIndex === fotoPrincipal;
      const max = esPrincipal ? TAM_PRINCIPAL : TAM_SECUNDARIA;
      const cal = esPrincipal ? CAL_PRINCIPAL : CAL_SECUNDARIA;
      const base64 = await resizeImage(file, max, cal);
      nuevaFotos.push(base64);
      renderFotosGrid();
    }catch(err){
      console.error('Error al procesar foto:', err);
    }
  }

  if(files.length > espacio){
    toast(`⚠️ Solo caben ${MAX_FOTOS} fotos`);
  }
  e.target.value = '';
}

function updatePreview(){
  let costoU;

  if(editandoProductoId){
    const p = window.DB.products.find(x => x.id === editandoProductoId);
    if(!p) return;
    costoU = calc(p).costoU;
  } else {
    const u = +$('#f-unidades').value || 0;
    const t = +$('#f-total').value    || 0;
    costoU = u > 0 ? t / u : 0;
  }

  const valor    = +$('#f-margen').value || 0;
  const unidades = +$('#f-unidades').value || 0;
  let precioVenta = costoU;

  if(tipoMargen === 'porcentaje'){
    precioVenta = costoU * (1 + valor / 100);
  } else if(tipoMargen === 'fijo'){
    if(margenScope === 'lote'){
      precioVenta = costoU + (unidades > 0 ? valor / unidades : 0);
    } else {
      precioVenta = costoU + valor;
    }
  } else if(tipoMargen === 'precio'){
    if(margenScope === 'lote'){
      precioVenta = unidades > 0 ? valor / unidades : 0;
    } else {
      precioVenta = valor;
    }
  }

  const gananciaU = precioVenta - costoU;
  const pct = costoU > 0 ? (gananciaU / costoU) * 100 : 0;

  if(editandoProductoId){
    $('#f-preview').innerHTML = `
      <div class="line">
        <span>Costo unitario (no editable)</span>
        <b>${fmt(costoU)}</b>
      </div>
      <div class="line">
        <span>Nuevo precio de venta</span>
        <b style="color:var(--green)">${fmt(precioVenta)}</b>
      </div>
      <div class="line">
        <span>Ganancia por unidad</span>
        <b>${fmt(gananciaU)} ${costoU > 0 ? `(${pct.toFixed(0)}%)` : ''}</b>
      </div>
      <div class="div"></div>
      <div class="hint" style="margin:0;padding-top:6px;font-size:11px">
        El costo y las unidades se modifican con "📦 Reabastecer".
      </div>`;
  } else {
    $('#f-preview').innerHTML = `
      <div class="line">
        <span>Costo por unidad</span>
        <b>${fmt(costoU)}</b>
      </div>
      <div class="line">
        <span>Precio de venta</span>
        <b style="color:var(--green)">${fmt(precioVenta)}</b>
      </div>
      <div class="line">
        <span>Ganancia por unidad</span>
        <b>${fmt(gananciaU)} ${costoU > 0 ? `(${pct.toFixed(0)}%)` : ''}</b>
      </div>
      <div class="div"></div>
      <div class="big">
        <span>Si vendes las ${unidades || 0}:</span>
        <span>+${fmt(gananciaU * (unidades || 0))}</span>
      </div>`;
  }
     }
/* =========================================================
   views/product-form.js — PARTE 2/2
   Guardar con IndexedDB
   ========================================================= */

function escanearCodigoForm(){
  openScanner((code) => {
    const existe = window.DB.products.find(p =>
      p.codigoBarras === code && p.id !== editandoProductoId
    );
    if(existe){
      toast(`⚠️ Código ya asignado a "${existe.nombre}"`);
      return;
    }
    $('#f-codigo').value = code;
    toast(`✅ Código escaneado`);
  });
}

function initProductForm(){
  $('#f-seg').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if(!btn) return;
    tipoMargen = btn.dataset.tipo;
    $('#f-seg').querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b === btn)
    );
    const scopeEl = $('#f-scope');
    if(scopeEl){
      scopeEl.style.display = (tipoMargen === 'porcentaje') ? 'none' : 'flex';
    }
    actualizarSegHint();
    actualizarPlaceholder();
    updatePreview();
  });

  const scopeEl = $('#f-scope');
  if(scopeEl){
    scopeEl.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if(!btn) return;
      margenScope = btn.dataset.scope;
      scopeEl.querySelectorAll('button').forEach(b =>
        b.classList.toggle('active', b === btn)
      );
      updatePreview();
    });
  }

  $('#f-total').addEventListener('input', () => {
    const u = +$('#f-unidades').value || 0;
    const t = +$('#f-total').value    || 0;
    if(u > 0) $('#f-unit').value = (t / u).toFixed(2);
    updatePreview();
  });

  $('#f-unit').addEventListener('input', () => {
    const u  = +$('#f-unidades').value || 0;
    const un = +$('#f-unit').value    || 0;
    if(u > 0) $('#f-total').value = (u * un).toFixed(2);
    updatePreview();
  });

  ['#f-unidades', '#f-margen', '#f-nombre'].forEach(sel =>
    $(sel).addEventListener('input', updatePreview)
  );

  $('#f-file').addEventListener('change', procesarFotos);
  $('#f-scan').addEventListener('click', escanearCodigoForm);
  $('#f-save').addEventListener('click', guardarProducto);
}

async function guardarProducto(){
  const nombre   = $('#f-nombre').value.trim();
  const codigo   = $('#f-codigo').value.trim();
  const valor    = +$('#f-margen').value || 0;

  const checkRestock = $('#f-restockeable');
  const restockeable = checkRestock ? checkRestock.checked : true;

  let tipoFinal = 'porcentaje';
  let unidadesMargen = null;

  if(tipoMargen === 'porcentaje'){
    tipoFinal = 'porcentaje';
  } else if(tipoMargen === 'fijo'){
    tipoFinal = (margenScope === 'lote') ? 'fijo-lote' : 'fijo';
    if(tipoFinal === 'fijo-lote') unidadesMargen = +$('#f-unidades').value || 0;
  } else if(tipoMargen === 'precio'){
    tipoFinal = (margenScope === 'lote') ? 'precio-lote' : 'precio';
    if(tipoFinal === 'precio-lote') unidadesMargen = +$('#f-unidades').value || 0;
  }

  /* -------- EDITAR -------- */
  if(editandoProductoId){
    const p = window.DB.products.find(x => x.id === editandoProductoId);
    if(!p) return;

    if(!nombre && !codigo){
      return toast('⚠️ Poné nombre o escaneá un código');
    }

    if(codigo){
      const dup = window.DB.products.find(x =>
        x.codigoBarras === codigo && x.id !== editandoProductoId
      );
      if(dup) return toast(`⚠️ Código ya asignado a "${dup.nombre}"`);
    }

    p.nombre        = nombre || '(sin nombre)';
    p.fotoPrincipal = fotoPrincipal;
    p.cantidadFotos = nuevaFotos.length;
    p.tipoMargen    = tipoFinal;
    p.valorMargen   = valor;
    p.codigoBarras  = codigo || null;
    p.restockeable  = restockeable;

    if(tipoFinal === 'fijo-lote' || tipoFinal === 'precio-lote'){
      p.unidadesMargen = unidadesMargen;
    } else {
      delete p.unidadesMargen;
    }

    try{
      await guardarFotosProducto(p.id, nuevaFotos);
      window.FOTOS[p.id] = [...nuevaFotos];
    }catch(e){
      console.error('Error al guardar fotos:', e);
      return toast('⚠️ No se pudieron guardar las fotos');
    }

    saveDB();
    renderAll();
    closeModal('#m-add');
    toast('✅ Cambios guardados');
    editandoProductoId = null;
    return;
  }

  /* -------- CREAR -------- */
  const u = +$('#f-unidades').value || 0;
  const t = +$('#f-total').value    || 0;

  if(!nombre && !codigo) return toast('⚠️ Poné nombre o escaneá un código');
  if(u <= 0) return toast('⚠️ Indica cuántas unidades');
  if(t <= 0) return toast('⚠️ Indica el costo de compra');

  if(codigo){
    const dup = window.DB.products.find(x => x.codigoBarras === codigo);
    if(dup) return toast(`⚠️ Código ya asignado a "${dup.nombre}"`);
  }

  const fechaCompra = $('#f-fecha').value || todayISO();
  const costoU = t / u;

  const primerLote = {
    id: 'lote_' + uid(),
    fecha: fechaCompra,
    unidadesCompradas: u,
    costoTotalCompra: t,
    costoUnitario: costoU
  };

  const producto = {
    id: uid(),
    nombre: nombre || '(sin nombre)',
    fotoPrincipal: fotoPrincipal,
    cantidadFotos: nuevaFotos.length,
    tipoMargen: tipoFinal,
    valorMargen: valor,
    codigoBarras: codigo || null,
    restockeable: restockeable,
    creado: Date.now(),
    favorito: false,
    lotes: [primerLote],
    ventas: []
  };

  if(tipoFinal === 'fijo-lote' || tipoFinal === 'precio-lote'){
    producto.unidadesMargen = unidadesMargen;
  }

  try{
    await guardarFotosProducto(producto.id, nuevaFotos);
    window.FOTOS[producto.id] = [...nuevaFotos];
  }catch(e){
    console.error('Error al guardar fotos:', e);
    return toast('⚠️ No se pudieron guardar las fotos');
  }

  window.DB.products.push(producto);

  saveDB();
  renderAll();
  closeModal('#m-add');
  toast('✅ Producto guardado');
  setTab(1);
     }

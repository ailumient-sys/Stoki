/* =========================================================
   views/invest.js — PARTE 1/3
   ========================================================= */

let invNuevaFotos    = [];
let invFotoPrincipal = 0;
let invTipoMargen    = 'porcentaje';
let invMargenScope   = 'unidad';
let invEditandoTempId = null;

const INV_MAX_FOTOS = 6;
const INV_TAM_PRINCIPAL = 420;
const INV_CAL_PRINCIPAL = 0.72;
const INV_TAM_SECUNDARIA = 320;
const INV_CAL_SECUNDARIA = 0.65;

function renderInvest(){
  const cont = $('#v-invest');
  if(!cont) return;

  const s = window.SESSION;

  if(!s || !s.activa){
    cont.innerHTML = buildInvestEmpty();
    bindInvestEmptyEvents();
    return;
  }

  cont.innerHTML = buildInvestPanel();
  bindInvestPanelEvents();
}

function buildInvestEmpty(){
  return `
    <div class="invest-empty">
      <div class="ico">💰</div>
      <h2>Planificá tu compra</h2>
      <p>
        Ingresá tu capital y armá la lista de productos que querés comprar.
        Stoki calcula tu ganancia estimada antes de gastar un peso.
      </p>
      <button class="btn-main" id="invest-start">
        🚀 Empezar a invertir
      </button>
    </div>`;
}

function bindInvestEmptyEvents(){
  const btn = $('#invest-start');
  if(btn) btn.addEventListener('click', () => openInvestCapital('crear'));
}

function buildInvestPanel(){
  const data = calcSesion();
  if(!data) return '';

  const capitalColor  = data.sobregiro ? 'var(--red)' : 'var(--txt)';
  const gananciaColor = data.gananciaTotal >= 0 ? 'var(--green)' : 'var(--red)';

  return `
    <div class="invest-header">
      <div class="invest-stat invest-stat-clickeable" data-tap="edit-capital">
        <div class="invest-stat-label">💰 Capital disponible</div>
        <div class="invest-stat-value" style="color:${capitalColor}">
          ${fmt(data.capitalDisponible)}
        </div>
        <div class="invest-stat-sub">de ${fmt(data.capitalInicial)}</div>
      </div>
      <div class="invest-stat">
        <div class="invest-stat-label">📈 Ganancia estimada</div>
        <div class="invest-stat-value" style="color:${gananciaColor}">
          ${data.gananciaTotal >= 0 ? '+' : ''}${fmt(data.gananciaTotal)}
        </div>
        <div class="invest-stat-sub">Proyección: ${fmt(data.proyeccionFinal)}</div>
      </div>
    </div>

    ${data.sobregiro ? buildSobregiroBanner(data) : ''}

    ${data.productos.length === 0
      ? buildListaVacia()
      : `
        <div class="invest-list-title">
          LISTA DE COMPRA (${data.productos.length})
        </div>
        <div class="invest-list">
          ${data.productos.map(buildInvestCard).join('')}
        </div>
      `
    }

    <button class="btn-ghost" id="invest-add">+ Agregar producto a la lista</button>

    ${data.productos.length > 0 ? `
      <button class="btn-main" id="invest-finish">
        ✅ Finalizar compra
      </button>
      <button class="btn-ghost btn-danger" id="invest-cancel">
        🗑️ Cancelar sesión
      </button>
    ` : ''}
  `;
}

function buildSobregiroBanner(data){
  const exceso = Math.abs(data.capitalDisponible);
  return `
    <div class="invest-alert">
      <div>
        ⚠️ Te pasaste por <b>${fmt(exceso)}</b><br>
        <span style="font-size:11px;opacity:.8">¿Querés ampliar tu capital?</span>
      </div>
      <button class="invest-alert-btn" id="invest-ampliar">
        Ampliar
      </button>
    </div>`;
}

function buildListaVacia(){
  return `
    <div class="invest-lista-vacia">
      <div style="font-size:40px;opacity:.4;margin-bottom:12px">📦</div>
      <div style="font-size:13px;line-height:1.6">
        Tu lista está vacía.<br>
        Agregá el primer producto que querés comprar.
      </div>
    </div>`;
}

function precioVentaTemp(p){
  const costoU = p.costoUnitario;
  const valor = Number(p.valorMargen) || 0;
  const unidadesMargen = Number(p.unidadesMargen) || 0;

  switch(p.tipoMargen){
    case 'porcentaje':  return costoU * (1 + valor / 100);
    case 'fijo':        return costoU + valor;
    case 'fijo-lote':   return costoU + (unidadesMargen > 0 ? valor / unidadesMargen : 0);
    case 'precio':      return valor;
    case 'precio-lote': return unidadesMargen > 0 ? valor / unidadesMargen : 0;
    default:            return costoU;
  }
}

function buildInvestCard(p){
  const costo = p.unidades * p.costoUnitario;
  const precioVenta = precioVentaTemp(p);
  const ganancia = (precioVenta - p.costoUnitario) * p.unidades;

  const thumb = buildInvestThumb(p);

  const codigoBadge = p.codigoBarras
    ? `<div style="font-size:10px;color:var(--dim);font-weight:600;margin-top:2px">🏷️ ${esc(p.codigoBarras)}</div>`
    : '';

  const unicoBadge = (p.restockeable === false)
    ? `<div style="font-size:10px;color:var(--dim);font-weight:800;margin-top:2px">🔒 Único</div>`
    : '';

  return `
    <div class="invest-card" data-tempid="${p.tempId}">
      <div class="invest-card-thumb-wrap">
        ${thumb}
      </div>

      <div class="invest-card-info">
        <div class="invest-card-name">${esc(p.nombre)}</div>
        <div class="invest-card-meta">
          ${p.unidades} u × ${fmt(p.costoUnitario)}
        </div>
        ${codigoBadge}
        ${unicoBadge}
        <div class="invest-card-prices">
          <span style="color:var(--red);font-weight:800">−${fmt(costo)}</span>
          <span style="color:var(--green);font-weight:800">
            ${ganancia >= 0 ? '+' : ''}${fmt(ganancia)}
          </span>
        </div>
      </div>

      <div class="invest-card-actions">
        <button class="invest-action" data-edit="${p.tempId}" aria-label="Editar">✏️</button>
        <button class="invest-action danger" data-del="${p.tempId}" aria-label="Eliminar">🗑️</button>
      </div>
    </div>`;
}

function buildInvestThumb(p){
  const base =
    `width:100%;height:100%;border-radius:10px;` +
    `background:var(--bg3);display:flex;align-items:center;` +
    `justify-content:center;font-size:20px;font-weight:800;` +
    `color:var(--dim);overflow:hidden;background-size:cover;` +
    `background-position:center;`;

  const foto = getFotoPrincipal(p);

  if(foto){
    return `<div style="${base}background-image:url('${foto}')"></div>`;
  }

  const inicial = esc((p.nombre || '?').charAt(0).toUpperCase());
  return `<div style="${base}">${inicial}</div>`;
}

function bindInvestPanelEvents(){
  const addBtn = $('#invest-add');
  if(addBtn) addBtn.addEventListener('click', () => openInvestProduct(null));

  const finishBtn = $('#invest-finish');
  if(finishBtn) finishBtn.addEventListener('click', openFinishPurchase);

  const cancelBtn = $('#invest-cancel');
  if(cancelBtn) cancelBtn.addEventListener('click', cancelarSesion);

  const ampliarBtn = $('#invest-ampliar');
  if(ampliarBtn) ampliarBtn.addEventListener('click', () => openInvestCapital('ampliar'));

  const capCard = document.querySelector('[data-tap="edit-capital"]');
  if(capCard) capCard.addEventListener('click', () => openInvestCapital('editar'));

  document.querySelectorAll('.invest-action[data-edit]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openInvestProduct(btn.dataset.edit);
    });
  });

  document.querySelectorAll('.invest-action[data-del]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      eliminarProductoTemporal(btn.dataset.del);
    });
  });
}

function calcSesion(){
  const s = window.SESSION;
  if(!s || !s.activa) return null;

  let costoTotal = 0;
  let gananciaTotal = 0;

  s.productos.forEach(p => {
    const costo = p.unidades * p.costoUnitario;
    const precioVenta = precioVentaTemp(p);
    const ganancia = (precioVenta - p.costoUnitario) * p.unidades;

    costoTotal += costo;
    gananciaTotal += ganancia;
  });

  const capitalDisponible = s.capitalInicial - costoTotal;
  const proyeccionFinal   = s.capitalInicial + gananciaTotal;

  return {
    capitalInicial: s.capitalInicial,
    capitalDisponible,
    costoTotal,
    gananciaTotal,
    proyeccionFinal,
    sobregiro: capitalDisponible < 0,
    productos: s.productos
  };
}

function openInvestCapital(modo){
  const s = window.SESSION;

  if(!modo){
    if(!s || !s.activa) modo = 'crear';
    else modo = 'editar';
  }

  window.capModo = modo;

  const titles = {
    crear:   '¿Cuánto vas a invertir?',
    ampliar: 'Ampliar capital',
    editar:  'Editar capital'
  };

  const btnText = {
    crear:   'Empezar a invertir',
    ampliar: 'Ampliar capital',
    editar:  '💾 Guardar cambio'
  };

  $('#cap-title').textContent = titles[modo];
  $('#cap-save').textContent  = btnText[modo];

  const subEl = $('#cap-sub');
  const inputEl = $('#cap-input');

  if(modo === 'editar' && s && s.activa){
    subEl.innerHTML =
      `Capital actual: <b>${fmt(s.capitalInicial)}</b><br>` +
      `Ingresá el nuevo valor (reemplaza el anterior):`;
    inputEl.value = s.capitalInicial;

  } else if(modo === 'ampliar' && s && s.activa){
    subEl.innerHTML =
      `Capital actual: <b>${fmt(s.capitalInicial)}</b><br>` +
      `¿Cuánto más querés agregar?`;
    inputEl.value = '';

  } else {
    subEl.textContent = 'Ingresá el capital que tenés disponible.';
    inputEl.value = '100';
  }

  openModal('#m-capital');

  setTimeout(() => {
    inputEl.focus();
    inputEl.select();
  }, 300);
}

function saveInvestCapital(){
  const val = +$('#cap-input').value || 0;
  const modo = window.capModo || 'crear';

  if(val <= 0){
    return toast('⚠️ Ingresá un valor mayor a 0');
  }

  if(modo === 'crear'){
    window.SESSION = {
      activa: true,
      capitalInicial: val,
      productos: [],
      creada: Date.now()
    };
    saveSession();
    toast('🚀 ¡Sesión iniciada!');

  } else if(modo === 'ampliar'){
    window.SESSION.capitalInicial += val;
    saveSession();
    toast(`✅ Capital ampliado en ${fmt(val)}`);

  } else {
    window.SESSION.capitalInicial = val;
    saveSession();
    toast(`✅ Capital actualizado a ${fmt(val)}`);
  }

  closeModal('#m-capital');
  window.capModo = null;
  renderInvest();
     }
/* =========================================================
   views/invest.js — PARTE 2/3
   ========================================================= */

function openInvestProduct(tempId){
  invEditandoTempId = tempId || null;

  if(tempId){
    const p = window.SESSION.productos.find(x => x.tempId === tempId);
    if(!p) return;

    invNuevaFotos    = [...(p.fotos || [])];
    invFotoPrincipal = p.fotoPrincipal || 0;

    let tipoBtn = 'porcentaje';
    let scope = 'unidad';

    if(p.tipoMargen === 'fijo') { tipoBtn = 'fijo'; scope = 'unidad'; }
    else if(p.tipoMargen === 'fijo-lote') { tipoBtn = 'fijo'; scope = 'lote'; }
    else if(p.tipoMargen === 'precio') { tipoBtn = 'precio'; scope = 'unidad'; }
    else if(p.tipoMargen === 'precio-lote') { tipoBtn = 'precio'; scope = 'lote'; }

    invTipoMargen = tipoBtn;
    invMargenScope = scope;

    $('#ip-title').textContent = 'Editar producto';
    $('#ip-nombre').value      = p.nombre || '';
    $('#ip-codigo').value      = p.codigoBarras || '';
    $('#ip-unidades').value    = p.unidades;
    $('#ip-total').value       = (p.unidades * p.costoUnitario).toFixed(2);
    $('#ip-unit').value        = p.costoUnitario.toFixed(2);
    $('#ip-margen').value      = p.valorMargen;

    const checkRestock = $('#ip-restockeable');
    if(checkRestock){
      checkRestock.checked = p.restockeable !== false;
    }

    $('#ip-seg').querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.dataset.tipo === invTipoMargen)
    );

    const scopeEl = $('#ip-scope');
    if(scopeEl){
      scopeEl.style.display = (invTipoMargen === 'porcentaje') ? 'none' : 'flex';
      scopeEl.querySelectorAll('button').forEach(b =>
        b.classList.toggle('active', b.dataset.scope === invMargenScope)
      );
    }

  } else {
    invNuevaFotos    = [];
    invFotoPrincipal = 0;
    invTipoMargen    = 'porcentaje';
    invMargenScope   = 'unidad';

    $('#ip-title').textContent = 'Agregar producto';
    $('#ip-nombre').value      = '';
    $('#ip-codigo').value      = '';
    $('#ip-unidades').value    = '';
    $('#ip-total').value       = '';
    $('#ip-unit').value        = '';
    $('#ip-margen').value      = '40';

    const checkRestock = $('#ip-restockeable');
    if(checkRestock) checkRestock.checked = true;

    $('#ip-seg').querySelectorAll('button').forEach((b, i) =>
      b.classList.toggle('active', i === 0)
    );

    const scopeEl = $('#ip-scope');
    if(scopeEl){
      scopeEl.style.display = 'none';
      scopeEl.querySelectorAll('button').forEach((b, i) =>
        b.classList.toggle('active', i === 0)
      );
    }
  }

  actualizarSegHintInv();
  actualizarPlaceholderInv();

  renderInvFotosGrid();
  updateInvPreview();
  openModal('#m-invest-product');
}

function actualizarSegHintInv(){
  const el = $('#ip-seg-hint');
  if(!el) return;

  const hints = {
    porcentaje: 'Porcentaje de ganancia sobre el costo',
    fijo:       'Cuánto querés ganar',
    precio:     'Precio de venta final'
  };

  el.textContent = hints[invTipoMargen] || '';
}

function actualizarPlaceholderInv(){
  const el = $('#ip-margen');
  if(!el) return;

  if(invTipoMargen === 'porcentaje')      el.placeholder = '40';
  else if(invTipoMargen === 'fijo')       el.placeholder = '1';
  else if(invTipoMargen === 'precio')     el.placeholder = '15';
}

function renderInvFotosGrid(){
  const cont = $('#ip-fotos-grid');
  if(!cont) return;

  cont.innerHTML = '';

  invNuevaFotos.forEach((foto, idx) => {
    const esPrincipal = idx === invFotoPrincipal;
    const div = document.createElement('div');
    div.className = 'foto-slot lleno';
    div.style.backgroundImage = `url('${foto}')`;
    div.innerHTML = `
      <button class="foto-slot-star ${esPrincipal ? 'activa' : ''}" type="button">${esPrincipal ? '⭐' : '☆'}</button>
      <button class="foto-slot-del" type="button">✕</button>
    `;

    div.querySelector('.foto-slot-star').addEventListener('click', e => {
      e.stopPropagation();
      marcarPrincipalInv(idx);
    });

    div.querySelector('.foto-slot-del').addEventListener('click', e => {
      e.stopPropagation();
      eliminarFotoInv(idx);
    });

    div.addEventListener('click', e => {
      if(e.target.closest('.foto-slot-del')) return;
      if(e.target.closest('.foto-slot-star')) return;
      marcarPrincipalInv(idx);
    });

    cont.appendChild(div);
  });

  if(invNuevaFotos.length < INV_MAX_FOTOS){
    const add = document.createElement('div');
    add.className = 'foto-slot vacio';
    add.textContent = '+';
    add.addEventListener('click', abrirSelectorFotoInv);
    cont.appendChild(add);
  }

  const cnt = $('#ip-fotos-count');
  if(cnt) cnt.textContent = `(${invNuevaFotos.length}/${INV_MAX_FOTOS})`;
}

async function marcarPrincipalInv(idx){
  if(idx < 0 || idx >= invNuevaFotos.length) return;
  if(idx === invFotoPrincipal) return;

  const anteriorIdx = invFotoPrincipal;

  try{
    const nuevaPrincipal = await recomprimirBase64(invNuevaFotos[idx], INV_TAM_PRINCIPAL, INV_CAL_PRINCIPAL);
    const anteriorBaja   = await recomprimirBase64(invNuevaFotos[anteriorIdx], INV_TAM_SECUNDARIA, INV_CAL_SECUNDARIA);

    invNuevaFotos[idx] = nuevaPrincipal;
    invNuevaFotos[anteriorIdx] = anteriorBaja;
    invFotoPrincipal = idx;

    renderInvFotosGrid();
    if(navigator.vibrate) navigator.vibrate(15);

  }catch(e){
    console.error('Error al recomprimir:', e);
    invFotoPrincipal = idx;
    renderInvFotosGrid();
  }
}

function eliminarFotoInv(idx){
  if(idx < 0 || idx >= invNuevaFotos.length) return;

  invNuevaFotos.splice(idx, 1);

  if(invFotoPrincipal === idx){ invFotoPrincipal = 0; }
  else if(invFotoPrincipal > idx){ invFotoPrincipal--; }

  if(!invNuevaFotos.length) invFotoPrincipal = 0;

  renderInvFotosGrid();
  if(navigator.vibrate) navigator.vibrate(10);
}

function abrirSelectorFotoInv(){
  const input = $('#ip-file');
  input.removeAttribute('capture');
  input.multiple = invNuevaFotos.length < INV_MAX_FOTOS - 1;
  input.click();
}

async function procesarFotosInv(e){
  const files = [...e.target.files];
  if(!files.length) return;

  const espacio = INV_MAX_FOTOS - invNuevaFotos.length;
  const aProcesar = files.slice(0, espacio);

  for(const file of aProcesar){
    try{
      const seraIndex = invNuevaFotos.length;
      const esPrincipal = seraIndex === invFotoPrincipal;

      const max = esPrincipal ? INV_TAM_PRINCIPAL : INV_TAM_SECUNDARIA;
      const cal = esPrincipal ? INV_CAL_PRINCIPAL : INV_CAL_SECUNDARIA;

      const base64 = await resizeImage(file, max, cal);
      invNuevaFotos.push(base64);
      renderInvFotosGrid();
    }catch(err){
      console.error('Error al procesar foto:', err);
    }
  }

  if(files.length > espacio){
    toast(`⚠️ Solo caben ${INV_MAX_FOTOS} fotos`);
  }

  e.target.value = '';
}

function updateInvPreview(){
  const u = +$('#ip-unidades').value || 0;
  const t = +$('#ip-total').value    || 0;
  const valor = +$('#ip-margen').value || 0;

  const costoU = u > 0 ? t / u : 0;

  let precioVenta = costoU;

  if(invTipoMargen === 'porcentaje'){
    precioVenta = costoU * (1 + valor / 100);

  } else if(invTipoMargen === 'fijo'){
    if(invMargenScope === 'lote'){
      precioVenta = costoU + (u > 0 ? valor / u : 0);
    } else {
      precioVenta = costoU + valor;
    }

  } else if(invTipoMargen === 'precio'){
    if(invMargenScope === 'lote'){
      precioVenta = u > 0 ? valor / u : 0;
    } else {
      precioVenta = valor;
    }
  }

  const gananciaU = precioVenta - costoU;
  const gananciaTotal = gananciaU * u;
  const pct = costoU > 0 ? (gananciaU / costoU) * 100 : 0;

  $('#ip-preview').innerHTML = `
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
      <span>Si vendes las ${u || 0}:</span>
      <span>+${fmt(gananciaTotal)}</span>
    </div>`;
}

function guardarProductoTemporal(){
  const nombre = $('#ip-nombre').value.trim();
  const codigo = $('#ip-codigo').value.trim();
  const u = +$('#ip-unidades').value || 0;
  const t = +$('#ip-total').value    || 0;
  const valor = +$('#ip-margen').value || 0;

  const checkRestock = $('#ip-restockeable');
  const restockeable = checkRestock ? checkRestock.checked : true;

  if(!nombre && !codigo){
    return toast('⚠️ Poné nombre o escaneá un código');
  }
  if(u <= 0)  return toast('⚠️ Indica cuántas unidades');
  if(t <= 0)  return toast('⚠️ Indica el costo de compra');

  if(codigo){
    const dup = window.SESSION.productos.find(p =>
      p.codigoBarras === codigo && p.tempId !== invEditandoTempId
    );
    if(dup) return toast(`⚠️ Ya está en la lista: "${dup.nombre}"`);
  }

  const costoU = t / u;

  let tipoFinal = 'porcentaje';
  let unidadesMargen = null;

  if(invTipoMargen === 'porcentaje'){
    tipoFinal = 'porcentaje';
  } else if(invTipoMargen === 'fijo'){
    tipoFinal = (invMargenScope === 'lote') ? 'fijo-lote' : 'fijo';
    if(tipoFinal === 'fijo-lote') unidadesMargen = u;
  } else if(invTipoMargen === 'precio'){
    tipoFinal = (invMargenScope === 'lote') ? 'precio-lote' : 'precio';
    if(tipoFinal === 'precio-lote') unidadesMargen = u;
  }

  const temp = {
    tempId: invEditandoTempId || ('tmp_' + uid()),
    nombre: nombre || '(sin nombre)',
    fotos: [...invNuevaFotos],
    fotoPrincipal: invFotoPrincipal,
    unidades: u,
    costoUnitario: costoU,
    tipoMargen: tipoFinal,
    valorMargen: valor,
    codigoBarras: codigo || null,
    restockeable: restockeable
  };

  if(tipoFinal === 'fijo-lote' || tipoFinal === 'precio-lote'){
    temp.unidadesMargen = unidadesMargen;
  }

  if(invEditandoTempId){
    const idx = window.SESSION.productos.findIndex(p => p.tempId === invEditandoTempId);
    if(idx >= 0) window.SESSION.productos[idx] = temp;
    toast('✅ Producto actualizado');
  } else {
    window.SESSION.productos.push(temp);
    toast('✅ Agregado a la lista');
  }

  saveSession();
  renderInvest();
  closeModal('#m-invest-product');

  invEditandoTempId = null;
}

function eliminarProductoTemporal(tempId){
  const s = window.SESSION;
  if(!s) return;

  const idx = s.productos.findIndex(p => p.tempId === tempId);
  if(idx < 0) return;

  s.productos.splice(idx, 1);
  saveSession();
  renderInvest();

  if(navigator.vibrate) navigator.vibrate(15);
  toast('🗑️ Producto eliminado');
}

async function cancelarSesion(){
  const ok = await confirmarAccion({
    titulo: 'Cancelar sesión de compra',
    mensaje: 'Se perderá la lista de productos que armaste.',
    botonOk: 'Sí, cancelar',
    botonCancel: 'Volver',
    colorOk: 'rojo'
  });

  if(!ok) return;

  clearSession();
  renderInvest();
  toast('🗑️ Sesión cancelada');
}

function openFinishPurchase(){
  const s = window.SESSION;
  if(!s || !s.productos.length){
    return toast('⚠️ La lista está vacía');
  }

  const data = calcSesion();

  $('#finish-sub').innerHTML =
    `${s.productos.length} producto${s.productos.length !== 1 ? 's' : ''} · ` +
    `Costo total: <b>${fmt(data.costoTotal)}</b>`;

  $('#finish-list').innerHTML = s.productos.map((p) => {
    const foto = getFotoPrincipal(p);
    const thumbStyle = foto
      ? `background-image:url('${foto}');background-size:cover;background-position:center;`
      : `background:var(--bg3);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--dim);`;

    const inicial = esc((p.nombre || '?').charAt(0).toUpperCase());
    const thumbContent = foto ? '' : inicial;
    const costo = p.unidades * p.costoUnitario;

    return `
      <label class="finish-item">
        <input type="checkbox" class="finish-check"
               data-tempid="${p.tempId}" checked>
        <div class="finish-thumb" style="${thumbStyle}">
          ${thumbContent}
        </div>
        <div class="finish-info">
          <div class="finish-name">${esc(p.nombre)}</div>
          <div class="finish-meta">
            ${p.unidades} u · Costo: ${fmt(costo)}
          </div>
        </div>
      </label>`;
  }).join('');

  openModal('#m-finish');
       }
/* =========================================================
   views/invest.js — PARTE 3/3
   ========================================================= */

async function finishPurchase(){
  const s = window.SESSION;
  if(!s || !s.activa) return;

  const seleccionados = [...document.querySelectorAll('.finish-check:checked')]
    .map(chk => chk.dataset.tempid);

  if(!seleccionados.length){
    return toast('⚠️ No marcaste ningún producto');
  }

  let creados = 0;

  for(const tempId of seleccionados){
    const tmp = s.productos.find(p => p.tempId === tempId);
    if(!tmp) continue;

    const lote = {
      id: 'lote_' + uid(),
      fecha: todayISO(),
      unidadesCompradas: tmp.unidades,
      costoTotalCompra: tmp.unidades * tmp.costoUnitario,
      costoUnitario: tmp.costoUnitario
    };

    const nuevoId = uid();
    const fotos = tmp.fotos || [];

    const producto = {
      id: nuevoId,
      nombre: tmp.nombre || '(sin nombre)',
      fotoPrincipal: tmp.fotoPrincipal || 0,
      cantidadFotos: fotos.length,
      tipoMargen: tmp.tipoMargen,
      valorMargen: tmp.valorMargen,
      codigoBarras: tmp.codigoBarras || null,
      restockeable: tmp.restockeable !== false,
      creado: Date.now(),
      favorito: false,
      lotes: [lote],
      ventas: []
    };

    if(tmp.tipoMargen === 'fijo-lote' || tmp.tipoMargen === 'precio-lote'){
      producto.unidadesMargen = tmp.unidadesMargen;
    }

    try{
      await guardarFotosProducto(nuevoId, fotos);
      window.FOTOS[nuevoId] = [...fotos];
    }catch(e){
      console.warn('Error al guardar fotos de', nuevoId, e);
    }

    window.DB.products.push(producto);
    creados++;
  }

  saveDB();
  clearSession();
  renderAll();

  closeModal('#m-finish');
  toast(`✅ ${creados} producto${creados !== 1 ? 's' : ''} agregado${creados !== 1 ? 's' : ''} al catálogo`);

  setTab(1);
}

function escanearCodigoInvest(){
  openScanner((code) => {
    const existe = window.DB.products.find(p => p.codigoBarras === code);

    if(existe){
      toast(`🔄 Ya existe: "${existe.nombre}" · Restock`);
    }

    const dup = window.SESSION && window.SESSION.productos.find(p =>
      p.codigoBarras === code && p.tempId !== invEditandoTempId
    );
    if(dup){
      toast(`⚠️ Ya está en la lista: "${dup.nombre}"`);
      return;
    }

    $('#ip-codigo').value = code;
    if(!existe) toast('✅ Código escaneado');
  });
}

function initInvest(){
  const capSave = $('#cap-save');
  if(capSave) capSave.addEventListener('click', saveInvestCapital);

  const capInput = $('#cap-input');
  if(capInput){
    capInput.addEventListener('keypress', e => {
      if(e.key === 'Enter') saveInvestCapital();
    });
  }

  const ipSeg = $('#ip-seg');
  if(ipSeg){
    ipSeg.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if(!btn) return;

      invTipoMargen = btn.dataset.tipo;
      ipSeg.querySelectorAll('button').forEach(b =>
        b.classList.toggle('active', b === btn)
      );

      const scopeEl = $('#ip-scope');
      if(scopeEl){
        scopeEl.style.display = (invTipoMargen === 'porcentaje') ? 'none' : 'flex';
      }

      actualizarSegHintInv();
      actualizarPlaceholderInv();
      updateInvPreview();
    });
  }

  const ipScope = $('#ip-scope');
  if(ipScope){
    ipScope.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if(!btn) return;

      invMargenScope = btn.dataset.scope;

      ipScope.querySelectorAll('button').forEach(b =>
        b.classList.toggle('active', b === btn)
      );

      updateInvPreview();
    });
  }

  const ipTotal = $('#ip-total');
  if(ipTotal){
    ipTotal.addEventListener('input', () => {
      const u = +$('#ip-unidades').value || 0;
      const t = +$('#ip-total').value    || 0;
      if(u > 0) $('#ip-unit').value = (t / u).toFixed(2);
      updateInvPreview();
    });
  }

  const ipUnit = $('#ip-unit');
  if(ipUnit){
    ipUnit.addEventListener('input', () => {
      const u  = +$('#ip-unidades').value || 0;
      const un = +$('#ip-unit').value    || 0;
      if(u > 0) $('#ip-total').value = (u * un).toFixed(2);
      updateInvPreview();
    });
  }

  ['#ip-unidades', '#ip-margen', '#ip-nombre'].forEach(sel => {
    const el = $(sel);
    if(el) el.addEventListener('input', updateInvPreview);
  });

  const ipFile = $('#ip-file');
  if(ipFile) ipFile.addEventListener('change', procesarFotosInv);

  const ipScan = $('#ip-scan');
  if(ipScan) ipScan.addEventListener('click', escanearCodigoInvest);

  const ipSave = $('#ip-save');
  if(ipSave) ipSave.addEventListener('click', guardarProductoTemporal);

  const finishSave = $('#finish-save');
  if(finishSave) finishSave.addEventListener('click', finishPurchase);
}

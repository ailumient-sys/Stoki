/* form-servicio.js — formulario de Servicio */
let _fsCons = [];

function renderFormServicio(){
  return `
    <label>Precio del servicio</label>
    <input id="fs-precio" type="number" inputmode="decimal" placeholder="Ej: 5" min="0" step="0.01">
    <label>Duración (min) <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span></label>
    <input id="fs-dur" type="number" inputmode="numeric" placeholder="Ej: 30" min="0">
    <label>Descripción <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span></label>
    <input id="fs-desc" placeholder="Ej: Incluye lavado + corte" autocomplete="off">
    <label>Consumibles <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span></label>
    <div id="fs-cons-list"></div>
    <button type="button" class="btn-ghost" id="fs-add-cons" style="margin-top:8px">+ Agregar consumible</button>
    <div class="preview" id="fs-preview"></div>
  `;
}

function bindFormServicio(){
  _fsCons = [];
  _fsRenderCons();
  document.querySelector('#fs-precio').oninput = _fsPreview;
  document.querySelector('#fs-add-cons').onclick = _fsAbrirPicker;
  _fsPreview();
}

function _fsRenderCons(){
  const c = document.querySelector('#fs-cons-list');
  if(!_fsCons.length){
    c.innerHTML = '<div style="text-align:center;color:var(--dim);font-size:12px;padding:14px">Sin consumibles</div>';
    return;
  }
  c.innerHTML = _fsCons.map((x,i) => `
    <div class="cart-item" style="margin-bottom:6px">
      <div class="cart-item-info">
        <div class="cart-item-name">${esc(x.nombre)}</div>
        <div class="cart-item-prices"><span>${fmtCantidadUnidad(x.cantidad,x.unidad)} × ${fmt(x.costoU)}</span></div>
      </div>
      <button class="cart-item-del" data-fsdel="${i}" type="button">🗑️</button>
    </div>`).join('');
  c.querySelectorAll('[data-fsdel]').forEach(b => {
    b.onclick = () => { _fsCons.splice(+b.dataset.fsdel,1); _fsRenderCons(); _fsPreview(); };
  });
}

function _fsAbrirPicker(){
  if(document.querySelector('#m-fs-pick')) return;
  const mats = (window.DB.products||[]).filter(p => {
    const t = tipoDe(p);
    return t===TIPOS.MATERIAL || (t===TIPOS.PRODUCTO && p.tambienMaterial);
  });
  if(!mats.length) return toast('⚠️ No tenés materiales todavía');
  const h = `
    <div class="overlay centered open" id="m-fs-pick" style="z-index:210">
      <div class="sheet" style="position:relative;max-width:420px">
        <button class="x" id="fsp-close">✕</button>
        <h2>Agregar consumible</h2>
        <div class="picker-list">
          ${mats.map(m => {
            const c = calc(m);
            return `<div class="picker-item" data-id="${m.id}">
              <div class="picker-info">
                <div class="picker-name">${esc(m.nombre)}</div>
                <div class="picker-meta">${fmtCantidadUnidad(c.stock, m.unidad)} disp.</div>
              </div></div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', h);
  const cerrar = () => document.querySelector('#m-fs-pick')?.remove();
  document.querySelector('#fsp-close').onclick = cerrar;
  document.querySelector('#m-fs-pick').onclick = e => { if(e.target.id==='m-fs-pick') cerrar(); };
  document.querySelectorAll('#m-fs-pick .picker-item').forEach(el => {
    el.onclick = () => { cerrar(); _fsPedirCant(el.dataset.id); };
  });
}

function _fsPedirCant(mid){
  const m = window.DB.products.find(x => x.id===mid);
  if(!m) return;
  const u = unidadInfo(m.unidad).abreviacion;
  const c = prompt(`¿Cuánto usa "${m.nombre}"?\n(En ${u})`, '1');
  if(c===null) return;
  const n = parseFloat(c);
  if(!n || n<=0) return;
  const cm = calcMaterial(m);
  _fsCons.push({ materialId:m.id, nombre:m.nombre, cantidad:n, unidad:m.unidad||'unidad', costoU:cm.costoU });
  _fsRenderCons();
  _fsPreview();
}

function _fsPreview(){
  const p = +document.querySelector('#fs-precio').value||0;
  const c = _fsCons.reduce((s,x) => s + x.costoU*x.cantidad, 0);
  const g = p - c;
  const pct = p>0 ? (g/p*100) : 0;
  document.querySelector('#fs-preview').innerHTML = `
    <div class="line"><span>Precio</span><b style="color:var(--green)">${fmt(p)}</b></div>
    <div class="line"><span>Costo consumibles</span><b>${fmt(c)}</b></div>
    <div class="line"><span>Ganancia neta</span><b>${fmt(g)} (${pct.toFixed(0)}%)</b></div>`;
}

function leerFormServicio(){
  const p = +document.querySelector('#fs-precio').value||0;
  if(p<=0) return { error:'⚠️ Poné un precio mayor a 0' };
  return {
    tipoMargen:'precio-fijo', valorMargen:p,
    duracion: +document.querySelector('#fs-dur').value||0,
    descripcion: (document.querySelector('#fs-desc').value||'').trim(),
    consumibles: _fsCons.map(x => ({ materialId:x.materialId, cantidad:x.cantidad })),
    stockInfinito: true
  };
}

/* form-receta.js — formulario de Receta (parte 1) */
let _frComp = [];

function renderFormReceta(){
  return `
    <label>Precio de venta</label>
    <input id="fr-precio" type="number" inputmode="decimal" placeholder="Ej: 5" min="0" step="0.01">
    <label>Composición</label>
    <div id="fr-comp-list"></div>
    <button type="button" class="btn-ghost" id="fr-add-comp" style="margin-top:8px">+ Agregar componente</button>
    <div class="preview" id="fr-preview"></div>
  `;
}

function bindFormReceta(){
  _frComp = [];
  _frRenderComp();
  document.querySelector('#fr-precio').oninput = _frPreview;
  document.querySelector('#fr-add-comp').onclick = _frAbrirPicker;
  _frPreview();
}

function _frRenderComp(){
  const c = document.querySelector('#fr-comp-list');
  if(!_frComp.length){
    c.innerHTML = '<div style="text-align:center;color:var(--dim);font-size:12px;padding:14px">Sin componentes</div>';
    return;
  }
  c.innerHTML = _frComp.map((x,i) => `
    <div class="cart-item" style="margin-bottom:6px">
      <div class="cart-item-info">
        <div class="cart-item-name">${esc(x.nombre)}</div>
        <div class="cart-item-prices"><span>${fmtCantidadUnidad(x.cantidad,x.unidad)} × ${fmt(x.costoU)}</span></div>
      </div>
      <button class="cart-item-del" data-frdel="${i}" type="button">🗑️</button>
    </div>`).join('');
  c.querySelectorAll('[data-frdel]').forEach(b => {
    b.onclick = () => { _frComp.splice(+b.dataset.frdel,1); _frRenderComp(); _frPreview(); };
  });
}

function _frAbrirPicker(){
  if(document.querySelector('#m-fr-pick')) return;
  const items = (window.DB.products||[]).filter(p => {
    const t = tipoDe(p);
    return t===TIPOS.MATERIAL || t===TIPOS.RECETA || (t===TIPOS.PRODUCTO && p.tambienMaterial);
  });
  if(!items.length) return toast('⚠️ No tenés materiales ni recetas todavía');
  const h = `
    <div class="overlay centered open" id="m-fr-pick" style="z-index:210">
      <div class="sheet" style="position:relative;max-width:420px">
        <button class="x" id="frp-close">✕</button>
        <h2>Elegir componente</h2>
        <div class="picker-list">
          ${items.map(m => {
            const c = calc(m);
            const ti = tipoInfo(m);
            const stk = c.stock === Infinity ? '∞' : fmtCantidadUnidad(c.stock, m.unidad);
            return `<div class="picker-item" data-id="${m.id}">
              <div class="picker-info">
                <div class="picker-name">${ti.emoji} ${esc(m.nombre)}</div>
                <div class="picker-meta">${stk} disp.</div>
              </div></div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', h);
  const cerrar = () => document.querySelector('#m-fr-pick')?.remove();
  document.querySelector('#frp-close').onclick = cerrar;
  document.querySelector('#m-fr-pick').onclick = e => { if(e.target.id==='m-fr-pick') cerrar(); };
  document.querySelectorAll('#m-fr-pick .picker-item').forEach(el => {
    el.onclick = () => { cerrar(); _frPedirCant(el.dataset.id); };
  });
}

function _frPedirCant(mid){
  const m = window.DB.products.find(x => x.id===mid);
  if(!m) return;
  const u = unidadInfo(m.unidad).abreviacion;
  const c = prompt(`¿Cuánto usa "${m.nombre}"?\n(En ${u})`, '1');
  if(c===null) return;
  const n = parseFloat(c);
  if(!n || n<=0) return;
  const cm = calc(m);
  _frComp.push({
    id: m.id,
    nombre: m.nombre,
    cantidad: n,
    unidad: m.unidad || 'unidad',
    costoU: cm.costoU || 0
  });
  _frRenderComp();
  _frPreview();
}

function _frPreview(){
  const p = +document.querySelector('#fr-precio').value||0;
  const c = _frComp.reduce((s,x) => s + x.costoU*x.cantidad, 0);
  const g = p - c;
  const pct = c>0 ? (g/c*100) : 0;
  document.querySelector('#fr-preview').innerHTML = `
    <div class="line"><span>Costo materiales</span><b>${fmt(c)}</b></div>
    <div class="line"><span>Precio venta</span><b style="color:var(--green)">${fmt(p)}</b></div>
    <div class="line"><span>Ganancia</span><b>${fmt(g)} (${pct.toFixed(0)}%)</b></div>`;
}

function leerFormReceta(){
  const p = +document.querySelector('#fr-precio').value||0;
  if(p<=0) return { error:'⚠️ Poné un precio mayor a 0' };
  if(!_frComp.length) return { error:'⚠️ Agregá al menos 1 componente' };
  return {
    tipoMargen: 'precio-fijo',
    valorMargen: p,
    componentes: _frComp.map(x => ({ id: x.id, cantidad: x.cantidad })),
    stockInfinito: false
  };
}

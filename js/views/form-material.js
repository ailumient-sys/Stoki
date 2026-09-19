/* form-material.js — formulario de Material */
function renderFormMaterial(){
  return `
    <label>Unidad de medida</label>
    <select id="fm-unidad">
      <option value="g">Gramo (g)</option>
      <option value="kg">Kilogramo (kg)</option>
      <option value="ml">Mililitro (ml)</option>
      <option value="l">Litro (l)</option>
      <option value="m">Metro (m)</option>
      <option value="cm">Centímetro (cm)</option>
      <option value="unidad">Unidad</option>
    </select>
    <label>Cantidad comprada</label>
    <input id="fm-stock" type="number" inputmode="decimal" placeholder="Ej: 5" min="0" step="0.01">
    <div class="row2">
      <div>
        <label>Costo total</label>
        <input id="fm-costo" type="number" inputmode="decimal" placeholder="0" min="0">
      </div>
      <div>
        <label>Costo por unidad</label>
        <input id="fm-costo-u" type="number" inputmode="decimal" readonly>
      </div>
    </div>
    <label>Fecha de compra</label>
    <input id="fm-fecha" type="date">
    <label class="check-row">
      <input type="checkbox" id="fm-vendible">
      <span>🛒 Vendible suelto (aparece en Vender)</span>
    </label>
    <div id="fm-zona-vend" style="display:none">
      <label>Precio de venta</label>
      <div class="seg seg-3" id="fm-mtipo">
        <button class="active" data-mtipo="pct-unidad" type="button">%</button>
        <button data-mtipo="fijo-unidad" type="button">$</button>
        <button data-mtipo="precio-fijo" type="button">💵</button>
      </div>
      <input id="fm-mvalor" type="number" inputmode="decimal" placeholder="40" style="margin-top:8px">
    </div>
    <div class="preview" id="fm-preview"></div>
  `;
}

function bindFormMaterial(){
  document.querySelector('#fm-fecha').value = todayISO();
  ['#fm-stock','#fm-costo','#fm-mvalor'].forEach(s => {
    const el = document.querySelector(s);
    if(el) el.oninput = () => { _fmCostoU(); _fmPreview(); };
  });
  document.querySelector('#fm-vendible').onchange = e => {
    document.querySelector('#fm-zona-vend').style.display = e.target.checked ? 'block' : 'none';
    _fmPreview();
  };
  const seg = document.querySelector('#fm-mtipo');
  seg.onclick = e => {
    const b = e.target.closest('button');
    if(!b) return;
    _fiMTipo = b.dataset.mtipo;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x===b));
    _fmPreview();
  };
  _fmPreview();
}

function _fmCostoU(){
  const st = +document.querySelector('#fm-stock').value||0;
  const t = +document.querySelector('#fm-costo').value||0;
  document.querySelector('#fm-costo-u').value = st>0 && t>0 ? (t/st).toFixed(4) : '';
}

function _fmPreview(){
  const st = +document.querySelector('#fm-stock').value||0;
  const t = +document.querySelector('#fm-costo').value||0;
  const u = document.querySelector('#fm-unidad').value;
  const cu = st>0 ? t/st : 0;
  const vnd = document.querySelector('#fm-vendible').checked;
  const v = +document.querySelector('#fm-mvalor').value||0;
  const pv = vnd ? calcularPrecioPorMargen(cu, st, _fiMTipo, v) : 0;
  const ui = unidadInfo(u);
  document.querySelector('#fm-preview').innerHTML = `
    <div class="line"><span>Unidad</span><b>${ui.nombre}</b></div>
    <div class="line"><span>Stock</span><b>${fmtCantidadUnidad(st, u)}</b></div>
    <div class="line"><span>Costo por ${ui.abreviacion}</span><b>${fmt(cu)}</b></div>
    ${vnd ? `<div class="line"><span>Precio suelto</span><b style="color:var(--green)">${fmt(pv)} / ${ui.abreviacion}</b></div>` : ''}`;
}

function leerFormMaterial(){
  const st = +document.querySelector('#fm-stock').value||0;
  const t = +document.querySelector('#fm-costo').value||0;
  const u = document.querySelector('#fm-unidad').value;
  const f = document.querySelector('#fm-fecha').value||todayISO();
  const vnd = document.querySelector('#fm-vendible').checked;
  const v = +document.querySelector('#fm-mvalor').value||0;
  if(st<=0) return { error:'⚠️ Poné una cantidad mayor a 0' };
  if(t<=0) return { error:'⚠️ Poné el costo de compra' };
  const cu = st>0 ? t/st : 0;
  return {
    unidad: u, vendibleSuelto: vnd,
    tipoMargen: vnd ? _fiMTipo : null,
    valorMargen: vnd ? v : 0,
    lotes: [{ id:'lote_'+uid(), fecha:f, unidadesCompradas:st, costoTotalCompra:t, costoUnitario:cu }]
  };
}

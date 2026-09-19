/* form-producto.js — formulario de Producto */
function renderFormProducto(){
  return `
    <label>Unidad</label>
    <select id="fp-unidad">
      <option value="unidad">Unidad</option>
      <option value="kg">Kilogramo (kg)</option>
      <option value="g">Gramo (g)</option>
      <option value="l">Litro (l)</option>
      <option value="ml">Mililitro (ml)</option>
      <option value="m">Metro (m)</option>
      <option value="cm">Centímetro (cm)</option>
    </select>
    <label>Stock</label>
    <input id="fp-stock" type="number" inputmode="decimal" placeholder="Ej: 20" min="0" step="0.01">
    <div class="row2">
      <div>
        <label>Costo total</label>
        <input id="fp-costo" type="number" inputmode="decimal" placeholder="0" min="0">
      </div>
      <div>
        <label>Costo por unidad</label>
        <input id="fp-costo-u" type="number" inputmode="decimal" placeholder="0" readonly>
      </div>
    </div>
    <label>Fecha de compra</label>
    <input id="fp-fecha" type="date">
    <label>Precio de venta</label>
    <div class="seg seg-3" id="fp-mtipo">
      <button class="active" data-mtipo="pct-unidad" type="button">%</button>
      <button data-mtipo="fijo-unidad" type="button">$</button>
      <button data-mtipo="fijo-lote" type="button">$ lote</button>
      <button data-mtipo="precio-fijo" type="button">💵</button>
    </div>
    <input id="fp-mvalor" type="number" inputmode="decimal" placeholder="40" style="margin-top:8px">
    <label class="check-row">
      <input type="checkbox" id="fp-stock-inf">
      <span>♾️ Stock infinito (no controlar)</span>
    </label>
    <label class="check-row">
      <input type="checkbox" id="fp-tamb-mat">
      <span>🧩 También es material (para recetas)</span>
    </label>
    <div class="preview" id="fp-preview"></div>
  `;
}

function bindFormProducto(){
  document.querySelector('#fp-fecha').value = todayISO();
  ['#fp-stock','#fp-costo','#fp-mvalor'].forEach(s => {
    const el = document.querySelector(s);
    if(el) el.oninput = () => { _fpCostoU(); _fpPreview(); };
  });
  const seg = document.querySelector('#fp-mtipo');
  seg.onclick = e => {
    const b = e.target.closest('button');
    if(!b) return;
    _fiMTipo = b.dataset.mtipo;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x===b));
    _fpPreview();
  };
  _fpPreview();
}

function _fpCostoU(){
  const st = +document.querySelector('#fp-stock').value||0;
  const t = +document.querySelector('#fp-costo').value||0;
  document.querySelector('#fp-costo-u').value = st>0 && t>0 ? (t/st).toFixed(2) : '';
}

function _fpPreview(){
  const st = +document.querySelector('#fp-stock').value||0;
  const t = +document.querySelector('#fp-costo').value||0;
  const v = +document.querySelector('#fp-mvalor').value||0;
  const cu = st>0 ? t/st : 0;
  const pv = calcularPrecioPorMargen(cu, st, _fiMTipo, v);
  const g = (pv - cu) * st;
  const pct = cu>0 ? ((pv-cu)/cu*100) : 0;
  document.querySelector('#fp-preview').innerHTML = `
    <div class="line"><span>Costo por unidad</span><b>${fmt(cu)}</b></div>
    <div class="line"><span>Precio de venta</span><b style="color:var(--green)">${fmt(pv)}</b></div>
    <div class="line"><span>Ganancia por unidad</span><b>${fmt(pv-cu)} ${cu>0?`(${pct.toFixed(0)}%)`:''}</b></div>
    <div class="div"></div>
    <div class="big"><span>Si vendes las ${st}:</span><span>+${fmt(g)}</span></div>`;
}

function leerFormProducto(){
  const st = +document.querySelector('#fp-stock').value||0;
  const t = +document.querySelector('#fp-costo').value||0;
  const v = +document.querySelector('#fp-mvalor').value||0;
  const u = document.querySelector('#fp-unidad').value;
  const f = document.querySelector('#fp-fecha').value||todayISO();
  const si = document.querySelector('#fp-stock-inf').checked;
  const tm = document.querySelector('#fp-tamb-mat').checked;
  if(st<=0) return { error:'⚠️ Poné un stock mayor a 0' };
  if(t<=0 && _fiMTipo!=='precio-fijo') return { error:'⚠️ Poné el costo de compra' };
  if(_fiMTipo==='precio-fijo' && v<=0) return { error:'⚠️ Poné el precio' };
  const cu = st>0 ? t/st : 0;
  return {
    unidad: u, tipoMargen: _fiMTipo, valorMargen: v,
    stockInfinito: si, tambienMaterial: tm, vendibleSuelto: true,
    lotes: [{ id:'lote_'+uid(), fecha:f, unidadesCompradas:st, costoTotalCompra:t, costoUnitario:cu }]
  };
}

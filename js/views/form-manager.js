/* form-manager.js — orquestador de forms por tipo */
let _fiTipo='producto', _fiEditId=null, _fiFotos=[], _fiFotoP=0, _fiCatId=null, _fiMTipo='pct-unidad';
const FI_MAX=6, FI_TP=420, FI_CP=0.72, FI_TS=320, FI_CS=0.65;

function abrirFormItem(tipo, editId){
  try{
    _abrirFormItemInterno(tipo, editId);
  }catch(e){
    alert('ERROR en abrirFormItem:\n' + (e.message || String(e)) + '\n\nStack: ' + (e.stack || 'sin stack'));
  }
}

function _abrirFormItemInterno(tipo, editId){
  _fiTipo = tipo || 'producto';
  _fiEditId = editId || null;
  _fiFotos = []; _fiFotoP = 0; _fiCatId = null; _fiMTipo = 'pct-unidad';
  if(document.querySelector('#m-form-item')) return;
  const h = `
    <div class="overlay open" id="m-form-item">
      <div class="sheet" style="position:relative">
        <div class="sheet-handle"></div>
        <button class="x" id="fi-close">✕</button>
        <h2 id="fi-title">Nuevo</h2>
        <div class="sub" id="fi-sub"></div>
        ${_fiEditId?'':`<label>Tipo</label>
        <div class="fi-tipo-row" id="fi-tipo-row">
          <button class="fi-tipo-btn active" data-tipo="producto" type="button">🟢 Producto</button>
          <button class="fi-tipo-btn" data-tipo="material" type="button">🔵 Material</button>
          <button class="fi-tipo-btn" data-tipo="receta" type="button">🟣 Receta</button>
          <button class="fi-tipo-btn" data-tipo="servicio" type="button">🔴 Servicio</button>
        </div>`}
        <label>Fotos <span id="fi-fotos-count" style="color:var(--dim);text-transform:none;font-weight:600">(0/6)</span></label>
        <div class="fotos-grid" id="fi-fotos-grid"></div>
        <input type="file" id="fi-file" accept="image/*" multiple>
        <label>Nombre</label>
        <input id="fi-nombre" placeholder="Ej: Coca-Cola 2L" autocomplete="off">
        <label>Código <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span></label>
        <div class="input-with-scan">
          <input id="fi-codigo" placeholder="Escaneá o escribí" autocomplete="off">
          <button class="btn-scan-inline" id="fi-scan" type="button">📷</button>
        </div>
        <label>Categoría <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span></label>
        <button type="button" class="cat-display-btn" id="fi-cat-display">
          <span>🏷️</span><span class="cat-display-text" id="fi-cat-text">Sin categoría</span><span>▾</span>
        </button>
        <div id="fi-zona"></div>
        <button class="btn-main" id="fi-save">Guardar</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', h);
  renderFiFotos();
  _fiRenderTipo();
  bindFormManager();
}

function cerrarFormItem(){
  document.querySelector('#m-form-item')?.remove();
  _fiEditId=null; _fiFotos=[]; _fiFotoP=0; _fiCatId=null;
}

function bindFormManager(){
  document.querySelector('#fi-close').onclick = cerrarFormItem;
  document.querySelector('#m-form-item').onclick = e => { if(e.target.id==='m-form-item') cerrarFormItem(); };
  document.querySelector('#fi-file').onchange = _fiProcFotos;
  document.querySelector('#fi-scan').onclick = _fiEscanear;
  document.querySelector('#fi-save').onclick = guardarFormItem;
  document.querySelector('#fi-cat-display').onclick = () => {
    abrirSelectorCategoria(id => { _fiCatId = id; _fiActCat(); });
  };
  const tr = document.querySelector('#fi-tipo-row');
  if(tr){
    tr.onclick = e => {
      const btn = e.target.closest('.fi-tipo-btn');
      if(!btn) return;
      _fiTipo = btn.dataset.tipo;
      tr.querySelectorAll('.fi-tipo-btn').forEach(b => b.classList.toggle('active', b===btn));
      _fiRenderTipo();
    };
  }
}

function _fiActCat(){
  const t = document.querySelector('#fi-cat-text');
  if(!t) return;
  if(!_fiCatId){ t.textContent='Sin categoría'; t.classList.remove('asignada'); return; }
  const c = buscarCategoria(_fiCatId);
  t.textContent = c ? c.nombre : 'Sin categoría';
  t.classList.toggle('asignada', !!c);
}

function _fiRenderTipo(){
  const c = document.querySelector('#fi-zona');
  if(!c) return;
  const T = { producto:'Nuevo producto', material:'Nuevo material', receta:'Nueva receta', servicio:'Nuevo servicio' };
  const S = { producto:'Compra y revende', material:'Insumo para recetas', receta:'Combina materiales para fabricar', servicio:'Vende tu trabajo' };
  document.querySelector('#fi-title').textContent = _fiEditId ? 'Editar' : T[_fiTipo];
  document.querySelector('#fi-sub').textContent = S[_fiTipo];
  if(_fiTipo==='producto'){ c.innerHTML=renderFormProducto(); bindFormProducto(); }
  else if(_fiTipo==='material'){ c.innerHTML=renderFormMaterial(); bindFormMaterial(); }
  else if(_fiTipo==='receta'){ c.innerHTML=renderFormReceta(); bindFormReceta(); }
  else if(_fiTipo==='servicio'){ c.innerHTML=renderFormServicio(); bindFormServicio(); }
}

function renderFiFotos(){
  const c = document.querySelector('#fi-fotos-grid');
  if(!c) return;
  c.innerHTML = '';
  _fiFotos.forEach((f, i) => {
    const p = i === _fiFotoP;
    const d = document.createElement('div');
    d.className = 'foto-slot lleno';
    d.style.backgroundImage = `url('${f}')`;
    d.innerHTML = `<button class="foto-slot-star ${p?'activa':''}" type="button">${p?'⭐':'☆'}</button><button class="foto-slot-del" type="button">✕</button>`;
    d.querySelector('.foto-slot-star').onclick = e => { e.stopPropagation(); _fiMarcarP(i); };
    d.querySelector('.foto-slot-del').onclick = e => { e.stopPropagation(); _fiElimF(i); };
    d.onclick = () => _fiMarcarP(i);
    c.appendChild(d);
  });
  if(_fiFotos.length < FI_MAX){
    const a = document.createElement('div');
    a.className = 'foto-slot vacio';
    a.textContent = '+';
    a.onclick = () => document.querySelector('#fi-file').click();
    c.appendChild(a);
  }
  const cnt = document.querySelector('#fi-fotos-count');
  if(cnt) cnt.textContent = `(${_fiFotos.length}/${FI_MAX})`;
}

async function _fiProcFotos(e){
  const fs = [...e.target.files];
  if(!fs.length) return;
  const esp = FI_MAX - _fiFotos.length;
  for(const f of fs.slice(0, esp)){
    try{
      const i = _fiFotos.length;
      const max = i===_fiFotoP ? FI_TP : FI_TS;
      const cal = i===_fiFotoP ? FI_CP : FI_CS;
      _fiFotos.push(await resizeImage(f, max, cal));
      renderFiFotos();
    }catch(err){ console.error(err); }
  }
  if(fs.length > esp) toast(`⚠️ Solo ${FI_MAX} fotos`);
  e.target.value = '';
}

function _fiElimF(i){
  _fiFotos.splice(i, 1);
  if(_fiFotoP === i) _fiFotoP = 0;
  else if(_fiFotoP > i) _fiFotoP--;
  if(!_fiFotos.length) _fiFotoP = 0;
  renderFiFotos();
}

async function _fiMarcarP(i){
  if(i===_fiFotoP || i<0 || i>=_fiFotos.length) return;
  const ant = _fiFotoP;
  try{
    const nv = await recomprimirBase64(_fiFotos[i], FI_TP, FI_CP);
    const bj = await recomprimirBase64(_fiFotos[ant], FI_TS, FI_CS);
    _fiFotos[i] = nv;
    _fiFotos[ant] = bj;
    _fiFotoP = i;
    renderFiFotos();
  }catch(e){ _fiFotoP = i; renderFiFotos(); }
}

function _fiEscanear(){
  if(typeof openScanner !== 'function') return toast('⚠️ Escáner no disponible');
  openScanner(c => {
    const d = (window.DB.products||[]).find(p => p.codigoBarras===c && p.id!==_fiEditId);
    if(d) return toast(`⚠️ Código ya asignado a "${d.nombre}"`);
    document.querySelector('#fi-codigo').value = c;
    toast('✅ Escaneado');
  });
}

async function guardarFormItem(){
  const n = (document.querySelector('#fi-nombre').value||'').trim();
  const c = (document.querySelector('#fi-codigo').value||'').trim();
  if(!n && !c) return toast('⚠️ Poné nombre o código');
  if(c){
    const d = (window.DB.products||[]).find(p => p.codigoBarras===c && p.id!==_fiEditId);
    if(d) return toast(`⚠️ Código ya asignado a "${d.nombre}"`);
  }
  let datos;
  if(_fiTipo==='producto') datos = leerFormProducto();
  else if(_fiTipo==='material') datos = leerFormMaterial();
  else if(_fiTipo==='receta') datos = leerFormReceta();
  else if(_fiTipo==='servicio') datos = leerFormServicio();
  if(!datos || datos.error) return toast(datos?.error || '⚠️ Error');
  const base = {
    nombre: n||'(sin nombre)', codigoBarras: c||null, categoriaId: _fiCatId||null,
    fotoPrincipal: _fiFotoP, cantidadFotos: _fiFotos.length, tipo: _fiTipo
  };
  if(_fiEditId){
    const p = window.DB.products.find(x => x.id===_fiEditId);
    if(!p) return toast('⚠️ No encontrado');
    Object.assign(p, base, datos);
    try{ await guardarFotosProducto(p.id, _fiFotos); window.FOTOS[p.id] = [..._fiFotos]; }catch(e){}
    saveDB(); renderAll(); cerrarFormItem(); toast('✅ Guardado');
    return;
  }
  const id = uid();
  const prod = { id, ...base, creado: Date.now(), favorito: false, ventas: [], ...datos };
  if(_fiTipo==='producto' || _fiTipo==='material') prod.lotes = datos.lotes || [];
  try{ await guardarFotosProducto(id, _fiFotos); window.FOTOS[id] = [..._fiFotos]; }catch(e){}
  window.DB.products.push(prod);
  saveDB(); renderAll(); cerrarFormItem();
  toast('✅ Guardado');
  if(navigator.vibrate) navigator.vibrate(20);
}

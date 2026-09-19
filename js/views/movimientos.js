/* movimientos.js — Propinas y mermas del día */
let _movTipo = 'propina';
let _movItems = [];

function abrirMovimiento(){
  if(document.querySelector('#m-movimiento')) return;

  _movTipo = 'propina';
  _movItems = [];

  const h = `
    <div class="overlay centered open" id="m-movimiento">
      <div class="sheet" style="position:relative;max-width:420px">
        <button class="x" id="mov-close">✕</button>
        <h2>💰 Registrar movimiento</h2>
        <div class="sub">Propina, extra o pérdida del día.</div>

        <div class="exp-toggle-row" id="mov-tipo">
          <button class="exp-modo-btn active" data-mtipo="propina" type="button">
            <span class="exp-modo-icon">➕</span>
            <span class="exp-modo-titulo">Propina / Extra</span>
            <span class="exp-modo-sub">Suma al cierre</span>
          </button>
          <button class="exp-modo-btn" data-mtipo="merma" type="button">
            <span class="exp-modo-icon">➖</span>
            <span class="exp-modo-titulo">Merma / Pérdida</span>
            <span class="exp-modo-sub">Resta al cierre</span>
          </button>
        </div>

        <label>Monto</label>
        <input id="mov-monto" type="number" inputmode="decimal" step="0.01" placeholder="0" min="0">

        <div id="mov-zona-merma" style="display:none">
          <label>¿De dónde vino la pérdida? <span style="color:var(--red)">*</span></label>
          <button type="button" class="cat-display-btn" id="mov-item-btn">
            <span>📦</span>
            <span class="cat-display-text" id="mov-item-txt">Elegir producto/servicio</span>
            <span>▾</span>
          </button>

          <label class="check-row" style="margin-top:10px">
            <input type="checkbox" id="mov-descontar" checked>
            <span>📉 Descontar del stock</span>
          </label>
        </div>

        <label>Descripción <span id="mov-desc-req" style="color:var(--red);display:none">*</span></label>
        <input id="mov-desc" placeholder="Ej: Cliente dejó propina" autocomplete="off">

        <div class="mov-preview" id="mov-preview"></div>

        <button class="btn-main" id="mov-save">✅ Registrar</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', h);

  const cerrar = () => document.querySelector('#m-movimiento')?.remove();
  document.querySelector('#mov-close').onclick = cerrar;
  document.querySelector('#m-movimiento').onclick = e => {
    if(e.target.id === 'm-movimiento') cerrar();
  };

  /* Cambio de tipo */
  document.querySelectorAll('#mov-tipo .exp-modo-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('#mov-tipo .exp-modo-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      _movTipo = b.dataset.mtipo;
      _movActualizarUI();
    };
  });

  /* Seleccionar ítem de la merma */
  document.querySelector('#mov-item-btn').onclick = abrirPickerItemMerma;

  document.querySelector('#mov-save').onclick = guardarMovimiento;

  document.querySelector('#mov-monto').oninput = updateMovPreview;
  document.querySelector('#mov-desc').oninput = updateMovPreview;

  _movActualizarUI();
  updateMovPreview();
}

/* ═══════════════════════════════════════════
   UI dinámica según tipo
   ═══════════════════════════════════════════ */
function _movActualizarUI(){
  const zona = document.querySelector('#mov-zona-merma');
  const descReq = document.querySelector('#mov-desc-req');
  const placeholder = document.querySelector('#mov-desc');

  if(_movTipo === 'merma'){
    if(zona) zona.style.display = 'block';
    if(descReq) descReq.style.display = 'inline';
    if(placeholder) placeholder.placeholder = '¿Qué pasó? Ej: se rompió, se dañó';
  } else {
    if(zona) zona.style.display = 'none';
    if(descReq) descReq.style.display = 'none';
    if(placeholder) placeholder.placeholder = 'Ej: Cliente dejó propina';
    _movItems = [];
    const txt = document.querySelector('#mov-item-txt');
    if(txt){
      txt.textContent = 'Elegir producto/servicio';
      txt.classList.remove('asignada');
    }
  }
  updateMovPreview();
}

function updateMovPreview(){
  const monto = +document.querySelector('#mov-monto').value || 0;
  const el = document.querySelector('#mov-preview');
  if(!el) return;

  const signo = _movTipo === 'propina' ? '+' : '−';
  const color = _movTipo === 'propina' ? 'var(--green)' : 'var(--red)';

  el.innerHTML = `
    <div class="line"><span>Tipo</span><b>${_movTipo === 'propina' ? '💰 Propina/Extra' : '⚠️ Merma/Pérdida'}</b></div>
    <div class="line"><span>Monto</span><b style="color:${color}">${signo}${fmt(monto)}</b></div>
  `;
}

/* ═══════════════════════════════════════════
   Picker de ítem para merma
   ═══════════════════════════════════════════ */
function abrirPickerItemMerma(){
  if(document.querySelector('#m-merma-pick')) return;

  const items = (window.DB.products || []);
  if(!items.length) return toast('⚠️ No tenés ítems');

  const h = `
    <div class="overlay centered open" id="m-merma-pick" style="z-index:220">
      <div class="sheet" style="position:relative;max-width:420px">
        <button class="x" id="mp-close">✕</button>
        <h2>Elegir ítem</h2>
        <div class="picker-list">
          ${items.map(p => {
            const ti = tipoInfo(p);
            return `
              <div class="picker-item" data-id="${p.id}">
                <div class="picker-info">
                  <div class="picker-name">${ti.emoji} ${esc(p.nombre)}</div>
                  <div class="picker-meta">${ti.nombre}</div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', h);

  const cerrar = () => document.querySelector('#m-merma-pick')?.remove();
  document.querySelector('#mp-close').onclick = cerrar;
  document.querySelector('#m-merma-pick').onclick = e => {
    if(e.target.id === 'm-merma-pick') cerrar();
  };

  document.querySelectorAll('#m-merma-pick .picker-item').forEach(el => {
    el.onclick = () => {
      const id = el.dataset.id;
      const p = window.DB.products.find(x => x.id === id);
      cerrar();
      if(!p) return;

      _movItems = [id];
      const txt = document.querySelector('#mov-item-txt');
      if(txt){
        txt.textContent = p.nombre;
        txt.classList.add('asignada');
      }
    };
  });
}

/* ═══════════════════════════════════════════
   GUARDAR MOVIMIENTO
   ═══════════════════════════════════════════ */
function guardarMovimiento(){
  const monto = +document.querySelector('#mov-monto').value || 0;
  const desc = (document.querySelector('#mov-desc').value || '').trim();
  const descontar = document.querySelector('#mov-descontar').checked;

  if(monto <= 0) return toast('⚠️ Poné un monto mayor a 0');
  if(_movTipo === 'merma' && !desc) return toast('⚠️ La descripción es obligatoria');
  if(_movTipo === 'merma' && !_movItems.length) return toast('⚠️ Elegí de dónde vino la pérdida');

  const mov = {
    id: 'mov_' + uid(),
    tipo: _movTipo,
    monto,
    descripcion: desc,
    itemId: _movItems[0] || null,
    descontar: _movTipo === 'merma' ? descontar : false,
    fecha: new Date().toISOString()
  };

  if(!Array.isArray(window.DB.movimientos)) window.DB.movimientos = [];
  window.DB.movimientos.push(mov);

  /* Descontar stock si aplica */
  if(_movTipo === 'merma' && descontar && _movItems[0]){
    const p = window.DB.products.find(x => x.id === _movItems[0]);
    if(p){
      const c = calc(p);
      const cantidadDescontar = Math.min(monto / (c.costoU || 1), c.stock || 0);

      if(cantidadDescontar > 0 && c.lotes && c.lotes.length){
        let restante = cantidadDescontar;
        c.lotes.forEach(lote => {
          if(restante <= 0) return;
          const consumir = Math.min(restante, lote.unidadesCompradas || 0);
          restante -= consumir;
          /* Registrar venta virtual para descontar FIFO */
          p.ventas = p.ventas || [];
          p.ventas.push({
            id: 'merma_' + uid(),
            cantidad: consumir,
            precioUnitario: 0,
            costoUnitario: lote.costoUnitario,
            loteId: lote.id,
            fecha: new Date().toISOString(),
            tipo: 'merma',
            motivo: desc
          });
        });
      }
    }
  }

  saveDB();
  document.querySelector('#m-movimiento')?.remove();

  toast(`✅ ${_movTipo === 'propina' ? 'Propina' : 'Merma'} registrada`);
  if(navigator.vibrate) navigator.vibrate(20);

  /* Actualizar cierre si está abierto */
  if(typeof abrirCierreDiario === 'function' && document.querySelector('#m-cierre')){
    document.querySelector('#m-cierre').remove();
    abrirCierreDiario();
  }
}

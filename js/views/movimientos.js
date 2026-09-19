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
            <span class="cat-display-text" id="mov-item-txt">Elegir ítem</span>
            <span>▾</span>
          </button>

          <div id="mov-cant-wrap" style="display:none">
            <label>Cantidad perdida <span style="color:var(--red)">*</span></label>
            <div class="input-with-scan" style="gap:6px">
              <input id="mov-cant" type="number" inputmode="decimal" step="0.01" placeholder="0" min="0" style="flex:1">
              <span class="rst-unidad" id="mov-cant-unit">u</span>
            </div>
            <div class="rst-unidad-info" id="mov-cant-info" style="font-size:11px;color:var(--dim);margin-top:4px;text-align:right"></div>
          </div>

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

  const cantInput = document.querySelector('#mov-cant');
  if(cantInput) cantInput.oninput = updateMovPreview;

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
  const montoInput = document.querySelector('#mov-monto');
  const cantWrap = document.querySelector('#mov-cant-wrap');

  if(_movTipo === 'merma'){
    if(zona) zona.style.display = 'block';
    if(descReq) descReq.style.display = 'inline';
    if(placeholder) placeholder.placeholder = '¿Qué pasó? Ej: se rompió, se dañó';

    /* Ocultar monto (se calcula auto) */
    const labelMonto = montoInput ? montoInput.previousElementSibling : null;
    if(montoInput) montoInput.style.display = 'none';
    if(labelMonto && labelMonto.tagName === 'LABEL') labelMonto.style.display = 'none';

    if(cantWrap) cantWrap.style.display = 'block';
  } else {
    if(zona) zona.style.display = 'none';
    if(descReq) descReq.style.display = 'none';
    if(placeholder) placeholder.placeholder = 'Ej: Cliente dejó propina';

    const labelMonto = montoInput ? montoInput.previousElementSibling : null;
    if(montoInput) montoInput.style.display = '';
    if(labelMonto && labelMonto.tagName === 'LABEL') labelMonto.style.display = '';

    if(cantWrap) cantWrap.style.display = 'none';

    _movItems = [];
    const txt = document.querySelector('#mov-item-txt');
    if(txt){
      txt.textContent = 'Elegir ítem';
      txt.classList.remove('asignada');
    }
  }
  updateMovPreview();
}

function updateMovPreview(){
  const el = document.querySelector('#mov-preview');
  if(!el) return;

  if(_movTipo === 'propina'){
    const monto = +document.querySelector('#mov-monto').value || 0;
    el.innerHTML = `
      <div class="line"><span>Tipo</span><b>💰 Propina/Extra</b></div>
      <div class="line"><span>Monto</span><b style="color:var(--green)">+${fmt(monto)}</b></div>
    `;
    return;
  }

  /* Merma: calcular desde cantidad */
  const cant = +document.querySelector('#mov-cant').value || 0;
  const id = _movItems[0];
  const p = id ? window.DB.products.find(x => x.id === id) : null;

  if(!p){
    el.innerHTML = `
      <div class="line"><span>Tipo</span><b>⚠️ Merma/Pérdida</b></div>
      <div class="line"><span>Elegí un ítem</span><b>—</b></div>
    `;
    return;
  }

  const c = calc(p);
  const u = unidadInfo(p.unidad || 'unidad');
  const monto = cant * c.costoU;

  el.innerHTML = `
    <div class="line"><span>Ítem</span><b>${esc(p.nombre)}</b></div>
    <div class="line"><span>Cantidad</span><b>${fmtCantidadUnidad(cant, p.unidad || 'unidad')}</b></div>
    <div class="line"><span>Costo unitario</span><b>${fmt(c.costoU)}/${u.abreviacion}</b></div>
    <div class="div"></div>
    <div class="line"><span>Pérdida calculada</span><b style="color:var(--red)">−${fmt(monto)}</b></div>
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

      /* Configurar unidad según tipo */
      const u = unidadInfo(p.unidad || 'unidad');
      const unitEl = document.querySelector('#mov-cant-unit');
      if(unitEl) unitEl.textContent = u.abreviacion;

      const cantEl = document.querySelector('#mov-cant');
      if(cantEl){
        cantEl.value = '';
        cantEl.step = u.decimales > 0 ? '0.01' : '1';
      }

      /* Info de stock disponible */
      const c = calc(p);
      const info = document.querySelector('#mov-cant-info');
      if(info){
        const stockTxt = c.stock === Infinity ? '∞' : fmtCantidadUnidad(c.stock, p.unidad || 'unidad');
        info.textContent = `Disponible: ${stockTxt} · Costo: ${fmt(c.costoU)}/${u.abreviacion}`;
      }

      updateMovPreview();
    };
  });
}

/* ═══════════════════════════════════════════
   GUARDAR MOVIMIENTO
   ═══════════════════════════════════════════ */
function guardarMovimiento(){
  const desc = (document.querySelector('#mov-desc').value || '').trim();

  if(_movTipo === 'propina'){
    /* PROPIANA: monto directo */
    const monto = +document.querySelector('#mov-monto').value || 0;
    if(monto <= 0) return toast('⚠️ Poné un monto mayor a 0');

    const mov = {
      id: 'mov_' + uid(),
      tipo: 'propina',
      monto,
      descripcion: desc || 'Propina',
      itemId: null,
      fecha: new Date().toISOString()
    };

    if(!Array.isArray(window.DB.movimientos)) window.DB.movimientos = [];
    window.DB.movimientos.push(mov);

  } else {
    /* MERMA: cantidad + ítem */
    const cant = +document.querySelector('#mov-cant').value || 0;
    const descontar = document.querySelector('#mov-descontar').checked;
    const id = _movItems[0];

    if(!id) return toast('⚠️ Elegí de dónde vino la pérdida');
    if(!desc) return toast('⚠️ La descripción es obligatoria');
    if(cant <= 0) return toast('⚠️ Poné una cantidad mayor a 0');

    const p = window.DB.products.find(x => x.id === id);
    if(!p) return toast('⚠️ Ítem no encontrado');

    const c = calc(p);

    /* Validar stock si se va a descontar */
    if(descontar){
      if(c.stock === Infinity) { /* sin límite */ }
      else if(cant > c.stock){
        return toast(`⚠️ Solo hay ${fmtCantidadUnidad(c.stock, p.unidad || 'unidad')}`);
      }
    }

    const monto = cant * c.costoU;

    const mov = {
      id: 'mov_' + uid(),
      tipo: 'merma',
      monto,
      cantidad: cant,
      unidad: p.unidad || 'unidad',
      descripcion: desc,
      itemId: id,
      itemNombre: p.nombre,
      descontar,
      fecha: new Date().toISOString()
    };

    if(!Array.isArray(window.DB.movimientos)) window.DB.movimientos = [];
    window.DB.movimientos.push(mov);

    /* Descontar stock aplicando FIFO */
    if(descontar && c.stock !== Infinity){
      let restante = cant;
      (p.lotes || []).forEach(lote => {
        if(restante <= 0) return;
        const disponibles = lote.unidadesCompradas || 0;
        const consumir = Math.min(restante, disponibles);
        restante -= consumir;

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

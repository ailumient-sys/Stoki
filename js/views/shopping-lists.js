/* =========================================================
   views/shopping-lists.js — Listas de compras
   ========================================================= */

window.SL = window.SL || { listaId: null, nombre: '', items: [] };

/* =========================================================
   RENDER
   ========================================================= */
function renderListas(){
  const cont = document.querySelector('#v-listas');
  if(!cont) return;

  const hayActiva = window.SL.listaId !== null || window.SL.items.length > 0 || window.SL.nombre;

  cont.innerHTML = hayActiva ? buildListaActiva() : buildListasGuardadas();
  bindListas();
}

function buildListasGuardadas(){
  const listas = window.DB.shoppingLists || [];

  const listasHTML = listas.length
    ? listas.map(l => {
        const total = l.items.reduce((s,i) => s + i.precio * i.cantidad, 0);
        const pend = l.items.filter(i => !i.comprado).length;
        const fecha = new Date(l.actualizado || l.creado).toLocaleDateString('es-VE', {day:'2-digit', month:'2-digit'});
        return `
          <div class="sl-card" data-id="${l.id}">
            <div class="sl-card-info">
              <div class="sl-card-nombre">${esc(l.nombre)}</div>
              <div class="sl-card-meta">
                ${l.items.length} item${l.items.length !== 1 ? 's' : ''} ·
                ${pend} pendiente${pend !== 1 ? 's' : ''} ·
                ${fmt(total)} · ${fecha}
              </div>
            </div>
            <button class="sl-card-del" data-del="${l.id}" type="button">🗑️</button>
            <div class="sl-card-chevron">›</div>
          </div>`;
      }).join('')
    : `<div class="empty" style="padding:50px 20px">
         <div class="ico">📝</div>
         <h3>Sin listas guardadas</h3>
         <p>Creá tu primera lista de compras<br>para ir al mercado.</p>
       </div>`;

  return `
    <div class="sl-header">
      <div class="sl-title">📝 Listas de compras</div>
    </div>

    <button class="btn-main" id="sl-nueva" style="margin-top:0;margin-bottom:16px">
      ➕ Nueva lista
    </button>

    <div class="sl-listas">${listasHTML}</div>
  `;
}

function buildListaActiva(){
  const sl = window.SL;
  const items = sl.items || [];

  const total = items.reduce((s,i) => s + i.precio * i.cantidad, 0);
  const comprado = items.filter(i => i.comprado).reduce((s,i) => s + i.precio * i.cantidad, 0);
  const pendiente = total - comprado;
  const refTotal = fmtRefOnly(total);

  const itemsHTML = items.length
    ? items.map(it => `
        <div class="sl-item ${it.comprado ? 'comprado' : ''}">
          <button class="sl-item-check" data-toggle="${it.id}" type="button">
            ${it.comprado ? '✓' : ''}
          </button>
          <div class="sl-item-info">
            <div class="sl-item-nombre">${esc(it.nombre)}</div>
            <div class="sl-item-meta">${it.cantidad} × ${fmt(it.precio)}</div>
          </div>
          <div class="sl-item-total">${fmt(it.cantidad * it.precio)}</div>
          <button class="sl-item-del" data-del="${it.id}" type="button">✕</button>
        </div>
      `).join('')
    : `<div class="sl-vacio">
         <div style="font-size:36px;opacity:.4;margin-bottom:10px">🛒</div>
         <div style="font-size:12px;color:var(--dim);line-height:1.6">
           Agregá productos abajo.
         </div>
       </div>`;

  return `
    <div class="sl-topbar">
      <button class="sl-back" id="sl-back" type="button">←</button>
      <input class="sl-nombre-input" id="sl-nombre"
             placeholder="Nombre de la lista"
             value="${esc(sl.nombre || '')}"
             autocomplete="off">
      <button class="sl-save-icon" id="sl-guardar" type="button" title="Guardar">💾</button>
    </div>

    <div class="sl-input-row">
      <input type="text" id="sl-add-nombre" placeholder="Producto" autocomplete="off">
      <input type="number" id="sl-add-precio" placeholder="$" inputmode="decimal" min="0">
      <input type="number" id="sl-add-cant" placeholder="U" inputmode="numeric" value="1" min="1" style="width:52px">
      <button id="sl-add-btn" type="button">+</button>
    </div>

    <div class="sl-items">${itemsHTML}</div>

    <div class="sl-totales">
      <div class="sl-total-line">
        <span>Total</span>
        <b>${fmt(total)}</b>
      </div>
      ${refTotal ? `<div class="sl-total-ref">${refTotal}</div>` : ''}
      ${comprado > 0 ? `
        <div class="sl-total-divider"></div>
        <div class="sl-total-line sl-total-comprado">
          <span>✓ Comprado</span>
          <b>${fmt(comprado)}</b>
        </div>
        <div class="sl-total-line sl-total-pendiente">
          <span>Pendiente</span>
          <b>${fmt(pendiente)}</b>
        </div>
      ` : ''}
    </div>

    <div class="sl-actions">
      <button class="btn-ghost" id="sl-cuotas" style="flex:1;margin-top:0">🧮 Cuotas</button>
      <button class="btn-ghost btn-danger" id="sl-borrar" style="flex:1;margin-top:0">🗑️ Borrar</button>
    </div>
  `;
}

/* =========================================================
   EVENTOS
   ========================================================= */
function bindListas(){
  const nueva = document.querySelector('#sl-nueva');
  if(nueva){
    nueva.addEventListener('click', () => {
      window.SL = { listaId: null, nombre: '', items: [] };
      renderListas();
    });
  }

  /* Cards guardadas */
  document.querySelectorAll('.sl-card').forEach(card => {
    card.addEventListener('click', e => {
      if(e.target.closest('.sl-card-del')) return;
      cargarListaGuardada(card.dataset.id);
    });
  });

  document.querySelectorAll('.sl-card-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      borrarListaGuardada(btn.dataset.del);
    });
  });

  /* Nombre */
  const nombre = document.querySelector('#sl-nombre');
  if(nombre){
    nombre.addEventListener('input', () => {
      window.SL.nombre = nombre.value.trim();
    });
  }

  /* Back */
  const back = document.querySelector('#sl-back');
  if(back){
    back.addEventListener('click', async () => {
      if(window.SL.items.length || window.SL.nombre){
        const ok = await confirmarAccion({
          titulo: '¿Salir sin guardar?',
          mensaje: 'Los cambios que hiciste no se guardaron.',
          botonOk: 'Salir',
          botonCancel: 'Volver',
          colorOk: 'rojo'
        });
        if(!ok) return;
      }
      window.SL = { listaId: null, nombre: '', items: [] };
      renderListas();
    });
  }

  /* Guardar */
  const btnGuardar = document.querySelector('#sl-guardar');
  if(btnGuardar){
    btnGuardar.addEventListener('click', guardarListaActual);
  }

  /* Agregar item */
  const btnAdd = document.querySelector('#sl-add-btn');
  if(btnAdd) btnAdd.addEventListener('click', agregarItemLista);

  ['#sl-add-nombre', '#sl-add-precio', '#sl-add-cant'].forEach(sel => {
    const el = document.querySelector(sel);
    if(el) el.addEventListener('keypress', e => {
      if(e.key === 'Enter') agregarItemLista();
    });
  });

  /* Toggle comprado */
  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const it = window.SL.items.find(x => x.id === btn.dataset.toggle);
      if(!it) return;
      it.comprado = !it.comprado;
      renderListas();
      if(navigator.vibrate) navigator.vibrate(10);
    });
  });

  /* Eliminar item */
  document.querySelectorAll('.sl-item-del').forEach(btn => {
    btn.addEventListener('click', () => {
      window.SL.items = window.SL.items.filter(x => x.id !== btn.dataset.del);
      renderListas();
    });
  });

  /* Cuotas */
  const cuotas = document.querySelector('#sl-cuotas');
  if(cuotas) cuotas.addEventListener('click', abrirCuotas);

  /* Borrar lista activa */
  const borrar = document.querySelector('#sl-borrar');
  if(borrar){
    borrar.addEventListener('click', async () => {
      if(!window.SL.items.length) return;
      const ok = await confirmarAccion({
        titulo: '¿Borrar todos los items?',
        mensaje: 'Se vaciará la lista actual.',
        botonOk: 'Borrar',
        botonCancel: 'Cancelar',
        colorOk: 'rojo'
      });
      if(!ok) return;
      window.SL.items = [];
      renderListas();
    });
  }

  const firstInput = document.querySelector('#sl-add-nombre');
  if(firstInput) setTimeout(() => firstInput.focus(), 100);
}

/* =========================================================
   ACCIONES
   ========================================================= */
function agregarItemLista(){
  const nEl = document.querySelector('#sl-add-nombre');
  const pEl = document.querySelector('#sl-add-precio');
  const cEl = document.querySelector('#sl-add-cant');
  if(!nEl || !pEl) return;

  const nombre = nEl.value.trim();
  const precio = +pEl.value || 0;
  const cant = +cEl.value || 1;

  if(!nombre) return toast('⚠️ Poné un nombre');
  if(precio <= 0) return toast('⚠️ Poné un precio');

  window.SL.items.push({
    id: 'sli_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    nombre, precio, cantidad: cant, comprado: false
  });

  nEl.value = '';
  pEl.value = '';
  cEl.value = '1';

  renderListas();
  if(navigator.vibrate) navigator.vibrate(10);

  setTimeout(() => {
    const inp = document.querySelector('#sl-add-nombre');
    if(inp) inp.focus();
  }, 50);
}

function cargarListaGuardada(id){
  const l = (window.DB.shoppingLists || []).find(x => x.id === id);
  if(!l) return;

  /* Copia profunda para no modificar el guardado hasta confirmar */
  window.SL = {
    listaId: l.id,
    nombre: l.nombre,
    items: JSON.parse(JSON.stringify(l.items))
  };

  renderListas();
}

async function guardarListaActual(){
  if(!window.SL.nombre){
    return toast('⚠️ Poné un nombre a la lista');
  }
  if(!window.SL.items.length){
    return toast('⚠️ La lista está vacía');
  }

  if(!Array.isArray(window.DB.shoppingLists)){
    window.DB.shoppingLists = [];
  }

  if(window.SL.listaId){
    const idx = window.DB.shoppingLists.findIndex(x => x.id === window.SL.listaId);
    if(idx >= 0){
      window.DB.shoppingLists[idx] = {
        ...window.DB.shoppingLists[idx],
        nombre: window.SL.nombre,
        items: JSON.parse(JSON.stringify(window.SL.items)),
        actualizado: Date.now()
      };
      saveDB();
      toast('✅ Lista actualizada');
      return;
    }
  }

  /* Nueva */
  const nueva = {
    id: 'sl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    nombre: window.SL.nombre,
    items: JSON.parse(JSON.stringify(window.SL.items)),
    creado: Date.now(),
    actualizado: Date.now()
  };

  window.DB.shoppingLists.push(nueva);
  window.SL.listaId = nueva.id;
  saveDB();
  toast('✅ Lista guardada');
}

async function borrarListaGuardada(id){
  const l = (window.DB.shoppingLists || []).find(x => x.id === id);
  if(!l) return;

  const ok = await confirmarAccion({
    titulo: `¿Eliminar "${l.nombre}"?`,
    mensaje: 'Esta acción no se puede deshacer.',
    botonOk: 'Eliminar',
    botonCancel: 'Cancelar',
    colorOk: 'rojo'
  });

  if(!ok) return;

  window.DB.shoppingLists = window.DB.shoppingLists.filter(x => x.id !== id);

  if(window.SL.listaId === id){
    window.SL = { listaId: null, nombre: '', items: [] };
  }

  saveDB();
  renderListas();
  toast('🗑️ Lista eliminada');
}

/* =========================================================
   CALCULADORA DE CUOTAS
   ========================================================= */
function abrirCuotas(){
  if(document.querySelector('#m-cuotas')) return;

  const total = window.SL.items.reduce((s,i) => s + i.precio * i.cantidad, 0);
  if(total <= 0) return toast('⚠️ Agregá productos primero');

  const html = `
    <div class="overlay centered open" id="m-cuotas">
      <div class="sheet" style="position:relative;max-width:380px">
        <button class="x" id="cuo-close">✕</button>
        <h2>🧮 Calcular cuotas</h2>
        <div class="sub">Total de la lista: <b>${fmt(total)}</b></div>

        <label>% de inicial</label>
        <input type="number" id="cuo-pct" inputmode="decimal"
               placeholder="20" min="0" max="100" value="20">

        <label>Cantidad de cuotas</label>
        <input type="number" id="cuo-n" inputmode="numeric"
               placeholder="6" min="1" value="6">

        <div class="cuo-resultado" id="cuo-res"></div>

        <button class="btn-main" id="cuo-ok" style="margin-top:16px">Listo</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#cuo-close').addEventListener('click', () => {
    document.querySelector('#m-cuotas').remove();
  });
  document.querySelector('#m-cuotas').addEventListener('click', e => {
    if(e.target.id === 'm-cuotas') e.target.remove();
  });

  const recalcular = () => {
    const pct = Math.max(0, Math.min(100, +document.querySelector('#cuo-pct').value || 0));
    const n = Math.max(1, +document.querySelector('#cuo-n').value || 1);

    const inicial = total * pct / 100;
    const resto = total - inicial;
    const cuota = resto / n;
    const refCuota = fmtRefOnly(cuota);
    const refInicial = fmtRefOnly(inicial);
    const refTotal = fmtRefOnly(total);

    document.querySelector('#cuo-res').innerHTML = `
      <div class="cuo-line">
        <span>Total</span>
        <b>${fmt(total)}</b>
      </div>
      ${refTotal ? `<div class="cuo-ref">${refTotal}</div>` : ''}

      <div class="cuo-line cuo-line-destacada">
        <span>Inicial (${pct}%)</span>
        <b style="color:var(--green)">${fmt(inicial)}</b>
      </div>
      ${refInicial ? `<div class="cuo-ref">${refInicial}</div>` : ''}

      <div class="cuo-line">
        <span>Queda por pagar</span>
        <b>${fmt(resto)}</b>
      </div>

      <div class="cuo-divider"></div>

      <div class="cuo-line cuo-line-grande">
        <span>${n} cuota${n !== 1 ? 's' : ''} de</span>
        <b style="color:var(--green)">${fmt(cuota)}</b>
      </div>
      ${refCuota ? `<div class="cuo-ref">${refCuota}</div>` : ''}
    `;
  };

  document.querySelector('#cuo-pct').addEventListener('input', recalcular);
  document.querySelector('#cuo-n').addEventListener('input', recalcular);

  recalcular();

  document.querySelector('#cuo-ok').addEventListener('click', () => {
    document.querySelector('#m-cuotas').remove();
  });
}

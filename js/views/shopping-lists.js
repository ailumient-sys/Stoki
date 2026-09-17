/* =========================================================
   views/shopping-lists.js — Pestaña Compras (calculadora)
   ========================================================= */

window.SL = window.SL || {
  listaId: null,
  nombre: 'Lista sin nombre',
  items: []
};

/* =========================================================
   RENDER PRINCIPAL
   ========================================================= */
function renderListas(){
  const cont = document.querySelector('#v-listas');
  if(!cont) return;

  const total = window.SL.items.reduce((s,i) => s + i.precio * i.cantidad, 0);
  const comprado = window.SL.items.filter(i => i.comprado).reduce((s,i) => s + i.precio * i.cantidad, 0);
  const pendiente = total - comprado;

  const itemsHTML = window.SL.items.length
    ? window.SL.items.map(it => `
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
         <div style="font-size:42px;opacity:.35;margin-bottom:12px">🛒</div>
         <div style="font-size:13px;color:var(--dim);line-height:1.6;font-weight:600">
           Agregá productos para<br>calcular el total.
         </div>
       </div>`;

  const refTotal = fmtRefOnly(total);
  const refComprado = comprado > 0 ? fmtRefOnly(comprado) : '';
  const refPendiente = comprado > 0 ? fmtRefOnly(pendiente) : '';

  cont.innerHTML = `
    <div class="sl-page-header">
      <div class="sl-page-title">🛒 Compras</div>
      <button class="sl-listas-btn" id="sl-listas-btn" type="button" title="Listas">
        📚
      </button>
    </div>

    <div class="sl-input-row">
      <input type="text" id="sl-add-nombre" placeholder="Producto" autocomplete="off">
      <input type="number" id="sl-add-precio" placeholder="$" inputmode="decimal" min="0">
      <input type="number" id="sl-add-cant" placeholder="U" inputmode="numeric" value="1" min="1" style="width:52px">
      <button id="sl-add-btn" type="button">+</button>
    </div>

    <div class="sl-items">${itemsHTML}</div>

    <div class="sl-footer">
      <div class="sl-footer-info">
        <div class="sl-footer-total">
          <span>Total</span>
          <b>${fmt(total)}</b>
        </div>
        ${refTotal ? `<div class="sl-footer-ref">${refTotal}</div>` : ''}
        ${comprado > 0 ? `
          <div class="sl-footer-sub">
            <span>✓ Comprado: <b>${fmt(comprado)}</b></span>
            <span>Pendiente: <b>${fmt(pendiente)}</b></span>
          </div>
        ` : ''}
      </div>
      <button class="sl-cuotas-btn" id="sl-cuotas-btn" type="button">
        🧮<br>Cuotas
      </button>
    </div>
  `;

  bindListas();
}

/* =========================================================
   EVENTOS DE LA PÁGINA
   ========================================================= */
function bindListas(){
  const btnAdd = document.querySelector('#sl-add-btn');
  if(btnAdd) btnAdd.addEventListener('click', agregarItemLista);

  ['#sl-add-nombre', '#sl-add-precio', '#sl-add-cant'].forEach(sel => {
    const el = document.querySelector(sel);
    if(el) el.addEventListener('keypress', e => {
      if(e.key === 'Enter') agregarItemLista();
    });
  });

  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const it = window.SL.items.find(x => x.id === btn.dataset.toggle);
      if(!it) return;
      it.comprado = !it.comprado;
      renderListas();
      if(navigator.vibrate) navigator.vibrate(10);
    });
  });

  document.querySelectorAll('.sl-item-del').forEach(btn => {
    btn.addEventListener('click', () => {
      window.SL.items = window.SL.items.filter(x => x.id !== btn.dataset.del);
      renderListas();
    });
  });

  const btnListas = document.querySelector('#sl-listas-btn');
  if(btnListas) btnListas.addEventListener('click', abrirPanelListas);

  const btnCuotas = document.querySelector('#sl-cuotas-btn');
  if(btnCuotas) btnCuotas.addEventListener('click', abrirCuotas);
}

/* =========================================================
   AGREGAR ITEM
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

/* =========================================================
   PANEL DE LISTAS (desplegable)
   ========================================================= */
function abrirPanelListas(){
  if(document.querySelector('#m-sl-panel')) return;

  const listas = window.DB.shoppingLists || [];

  const listasHTML = listas.length
    ? listas.map(l => {
        const total = l.items.reduce((s,i) => s + i.precio * i.cantidad, 0);
        const pend = l.items.filter(i => !i.comprado).length;
        const fecha = new Date(l.actualizado || l.creado).toLocaleDateString('es-VE', {day:'2-digit', month:'2-digit'});
        const esActual = l.id === window.SL.listaId;
        return `
          <div class="sl-panel-card ${esActual ? 'activa' : ''}" data-id="${l.id}">
            <div class="sl-panel-info">
              <div class="sl-panel-nombre">
                ${esActual ? '📍 ' : ''}${esc(l.nombre)}
              </div>
              <div class="sl-panel-meta">
                ${l.items.length} item${l.items.length !== 1 ? 's' : ''} ·
                ${pend} pend. · ${fmt(total)} · ${fecha}
              </div>
            </div>
            <button class="sl-panel-del" data-del="${l.id}" type="button">🗑️</button>
          </div>`;
      }).join('')
    : `<div class="sl-panel-empty">
         <div style="font-size:36px;opacity:.35;margin-bottom:10px">📚</div>
         <div style="font-size:12px;color:var(--dim);line-height:1.6;font-weight:600">
           Todavía no tenés listas guardadas.
         </div>
       </div>`;

  const html = `
    <div class="overlay centered open" id="m-sl-panel">
      <div class="sheet" style="position:relative;max-width:420px">
        <button class="x" id="slp-close">✕</button>
        <h2>📚 Listas guardadas</h2>
        <div class="sub">Cargá, guardá o creá una nueva.</div>

        <div class="sl-panel-actions">
          <button class="sl-panel-action" id="slp-nueva" type="button">
            <span class="sl-pa-icon">➕</span>
            <span class="sl-pa-title">Nueva lista</span>
            <span class="sl-pa-sub">Vaciar la actual</span>
          </button>
          <button class="sl-panel-action" id="slp-guardar" type="button">
            <span class="sl-pa-icon">💾</span>
            <span class="sl-pa-title">Guardar</span>
            <span class="sl-pa-sub">Guardar la actual</span>
          </button>
        </div>

        <div class="sl-panel-title">Cargar una lista</div>
        <div class="sl-panel-list">${listasHTML}</div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const cerrar = () => {
    const el = document.querySelector('#m-sl-panel');
    if(el) el.remove();
  };

  document.querySelector('#slp-close').addEventListener('click', cerrar);
  document.querySelector('#m-sl-panel').addEventListener('click', e => {
    if(e.target.id === 'm-sl-panel') cerrar();
  });

  /* Nueva */
  document.querySelector('#slp-nueva').addEventListener('click', async () => {
    if(window.SL.items.length){
      const ok = await confirmarAccion({
        titulo: '¿Empezar nueva lista?',
        mensaje: 'La lista actual se perderá si no la guardaste.',
        botonOk: 'Nueva',
        botonCancel: 'Cancelar',
        colorOk: 'rojo'
      });
      if(!ok) return;
    }
    window.SL = { listaId: null, nombre: 'Lista sin nombre', items: [] };
    cerrar();
    renderListas();
    toast('📝 Lista nueva');
  });

  /* Guardar */
  document.querySelector('#slp-guardar').addEventListener('click', () => {
    cerrar();
    setTimeout(() => guardarListaActual(), 150);
  });

  /* Cargar */
  document.querySelectorAll('.sl-panel-card').forEach(card => {
    card.addEventListener('click', async e => {
      if(e.target.closest('.sl-panel-del')) return;

      if(window.SL.items.length && !window.SL.listaId){
        const ok = await confirmarAccion({
          titulo: '¿Cargar esta lista?',
          mensaje: 'Los cambios actuales se perderán.',
          botonOk: 'Cargar',
          botonCancel: 'Cancelar',
          colorOk: 'rojo'
        });
        if(!ok) return;
      }

      cargarListaGuardada(card.dataset.id);
      cerrar();
    });
  });

  /* Eliminar */
  document.querySelectorAll('.sl-panel-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      borrarListaGuardada(btn.dataset.del);
      cerrar();
    });
  });
}

/* =========================================================
   CARGAR / GUARDAR / BORRAR
   ========================================================= */
function cargarListaGuardada(id){
  const l = (window.DB.shoppingLists || []).find(x => x.id === id);
  if(!l) return;

  window.SL = {
    listaId: l.id,
    nombre: l.nombre,
    items: JSON.parse(JSON.stringify(l.items))
  };

  renderListas();
  toast(`📥 Cargada: ${l.nombre}`);
}

async function guardarListaActual(){
  if(!window.SL.items.length){
    return toast('⚠️ La lista está vacía');
  }

  const nombre = window.SL.nombre && window.SL.nombre !== 'Lista sin nombre'
    ? window.SL.nombre
    : null;

  /* Pedir nombre si no tiene */
  if(!nombre){
    const n = prompt('Nombre de la lista:', 'Mercado quincenal');
    if(!n || !n.trim()) return;
    window.SL.nombre = n.trim();
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
      toast(`💾 "${window.SL.nombre}" actualizada`);
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
  toast(`💾 "${window.SL.nombre}" guardada`);
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
    window.SL.listaId = null;
    window.SL.nombre = 'Lista sin nombre';
  }

  saveDB();
  renderListas();
  toast('🗑️ Lista eliminada');
}

/* =========================================================
   CALCULADORA DE CUOTAS
   ========================================================= */
window.CUOTAS_TMP = null;

function abrirCuotas(){
  if(document.querySelector('#m-cuotas')) return;

  const total = window.SL.items.reduce((s,i) => s + i.precio * i.cantidad, 0);
  if(total <= 0) return toast('⚠️ Agregá productos primero');

  /* Estado inicial: inicial 20%, 3 cuotas del 26.66% cada una (suma 100) */
  if(!window.CUOTAS_TMP || window.CUOTAS_TMP.total !== total){
    window.CUOTAS_TMP = {
      total,
      inicial: 20,
      cuotas: [20, 20, 20, 20]  /* 4 cuotas, suma 100% */
    };
  }

  const html = `
    <div class="overlay centered open" id="m-cuotas">
      <div class="sheet" style="position:relative;max-width:420px">
        <button class="x" id="cuo-close">✕</button>
        <h2>🧮 Calcular cuotas</h2>
        <div class="sub">Total: <b>${fmt(total)}</b></div>

        <label>% de inicial</label>
        <input type="number" id="cuo-inicial" inputmode="decimal"
               value="${window.CUOTAS_TMP.inicial}" min="0" max="100" step="1">

        <div class="cuo-cuotas-header">
          <label style="margin:0">Cuotas (${window.CUOTAS_TMP.cuotas.length})</label>
          <button class="cuo-add-cuota" id="cuo-add" type="button">➕ Agregar</button>
        </div>

        <div id="cuo-cuotas-list"></div>

        <div class="cuo-resumen" id="cuo-resumen"></div>

        <button class="btn-main" id="cuo-ok" style="margin-top:14px">Listo</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const cerrar = () => {
    const el = document.querySelector('#m-cuotas');
    if(el) el.remove();
    window.CUOTAS_TMP = null;
  };

  document.querySelector('#cuo-close').addEventListener('click', cerrar);
  document.querySelector('#m-cuotas').addEventListener('click', e => {
    if(e.target.id === 'm-cuotas') cerrar();
  });

  document.querySelector('#cuo-ok').addEventListener('click', cerrar);

  document.querySelector('#cuo-inicial').addEventListener('input', e => {
    window.CUOTAS_TMP.inicial = Math.max(0, Math.min(100, +e.target.value || 0));
    actualizarCuotas();
  });

  document.querySelector('#cuo-add').addEventListener('click', () => {
    const cuotas = window.CUOTAS_TMP.cuotas;
    const suma = window.CUOTAS_TMP.inicial + cuotas.reduce((s,v) => s+v, 0);

    if(suma >= 100){
      return toast('⚠️ Ya suman 100%');
    }
    cuotas.push(0);
    renderCuotasList();
    actualizarCuotas();
  });

  renderCuotasList();
  actualizarCuotas();
}

function renderCuotasList(){
  const cont = document.querySelector('#cuo-cuotas-list');
  if(!cont) return;

  const cuotas = window.CUOTAS_TMP.cuotas;

  cont.innerHTML = cuotas.map((pct, i) => `
    <div class="cuo-cuota-row">
      <span class="cuo-cuota-label">Cuota ${i + 1}</span>
      <input type="number" class="cuo-cuota-input" data-idx="${i}"
             value="${pct}" min="0" max="100" step="1" inputmode="decimal">
      <span class="cuo-cuota-pct">%</span>
      <button class="cuo-cuota-del" data-del="${i}" type="button">✕</button>
    </div>
  `).join('');

  cont.querySelectorAll('.cuo-cuota-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = +inp.dataset.idx;
      window.CUOTAS_TMP.cuotas[idx] = Math.max(0, Math.min(100, +inp.value || 0));
      actualizarCuotas();
    });
  });

  cont.querySelectorAll('.cuo-cuota-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.del;
      window.CUOTAS_TMP.cuotas.splice(idx, 1);
      renderCuotasList();
      actualizarCuotas();
    });
  });
}

function actualizarCuotas(){
  if(!window.CUOTAS_TMP) return;

  const { total, inicial, cuotas } = window.CUOTAS_TMP;
  const sumaCuotas = cuotas.reduce((s,v) => s+v, 0);
  const sumaTotal = inicial + sumaCuotas;

  const montoInicial = total * inicial / 100;
  const montoCuotas = cuotas.map(p => total * p / 100);
  const restante = total - montoInicial - montoCuotas.reduce((s,v) => s+v, 0);

  const colorSuma = Math.abs(sumaTotal - 100) < 0.01
    ? 'var(--green)'
    : sumaTotal > 100 ? 'var(--red)' : 'var(--amber)';

  let resumenHTML = `
    <div class="cuo-resumen-line">
      <span>Inicial (${inicial}%)</span>
      <b>${fmt(montoInicial)}</b>
    </div>
  `;

  if(fmtRefOnly(montoInicial)){
    resumenHTML += `<div class="cuo-resumen-ref">${fmtRefOnly(montoInicial)}</div>`;
  }

  cuotas.forEach((pct, i) => {
    resumenHTML += `
      <div class="cuo-resumen-line">
        <span>Cuota ${i + 1} (${pct}%)</span>
        <b>${fmt(montoCuotas[i])}</b>
      </div>
    `;
    if(fmtRefOnly(montoCuotas[i])){
      resumenHTML += `<div class="cuo-resumen-ref">${fmtRefOnly(montoCuotas[i])}</div>`;
    }
  });

  resumenHTML += `
    <div class="cuo-resumen-divider"></div>
    <div class="cuo-resumen-line cuo-resumen-suma">
      <span>Suma de %</span>
      <b style="color:${colorSuma}">${sumaTotal.toFixed(1)}%</b>
    </div>
    ${Math.abs(restante) > 0.01 ? `
      <div class="cuo-resumen-line">
        <span>Sin asignar</span>
        <b style="color:${restante > 0 ? 'var(--amber)' : 'var(--red)'}">${fmt(Math.abs(restante))}</b>
      </div>
    ` : ''}
  `;

  const resumen = document.querySelector('#cuo-resumen');
  if(resumen) resumen.innerHTML = resumenHTML;
}

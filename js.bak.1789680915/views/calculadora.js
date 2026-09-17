/* =========================================================
   views/calculadora.js — Calculadora de compras rápida
   ========================================================= */

window.calcItems = window.calcItems || [];

function abrirCalculadora(){
  if(document.querySelector('#m-calc')) return;

  const html = `
    <div class="overlay centered open" id="m-calc">
      <div class="sheet" style="position:relative;max-width:420px">
        <button class="x" id="calc-close">✕</button>
        <h2>🧮 Calculadora de compras</h2>
        <div class="sub">Sumá productos mientras comprás y mirá el total.</div>

        <div class="calc-input-row">
          <input type="text" id="calc-nombre" placeholder="Producto" autocomplete="off">
          <input type="number" id="calc-precio" placeholder="$" inputmode="decimal" min="0">
          <input type="number" id="calc-cant" placeholder="U" inputmode="numeric" value="1" min="1" style="width:60px">
          <button id="calc-add" type="button">+</button>
        </div>

        <div class="calc-lista" id="calc-lista"></div>

        <div class="calc-total" id="calc-total">
          <div class="calc-total-line">
            <span>Total estimado</span>
            <b id="calc-total-valor">$0</b>
          </div>
        </div>

        <button class="btn-ghost btn-danger" id="calc-vaciar" style="margin-top:10px">
          🗑️ Vaciar lista
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  renderCalculadora();

  document.querySelector('#calc-close').addEventListener('click', cerrarCalculadora);
  document.querySelector('#m-calc').addEventListener('click', e => {
    if(e.target.id === 'm-calc') cerrarCalculadora();
  });

  document.querySelector('#calc-add').addEventListener('click', agregarItemCalculadora);

  document.querySelector('#calc-nombre').addEventListener('keypress', e => {
    if(e.key === 'Enter') document.querySelector('#calc-precio').focus();
  });
  document.querySelector('#calc-precio').addEventListener('keypress', e => {
    if(e.key === 'Enter') agregarItemCalculadora();
  });

  setTimeout(() => {
    const inp = document.querySelector('#calc-nombre');
    if(inp) inp.focus();
  }, 250);

  document.querySelector('#calc-vaciar').addEventListener('click', async () => {
    if(!window.calcItems.length) return;
    const ok = await confirmarAccion({
      titulo: '¿Vaciar la lista?',
      mensaje: 'Se borrarán todos los items.',
      botonOk: 'Vaciar',
      botonCancel: 'Cancelar',
      colorOk: 'rojo'
    });
    if(!ok) return;
    window.calcItems = [];
    renderCalculadora();
    toast('🗑️ Lista vaciada');
  });
}

function cerrarCalculadora(){
  const el = document.querySelector('#m-calc');
  if(el) el.remove();
}

function agregarItemCalculadora(){
  const nombre = document.querySelector('#calc-nombre').value.trim();
  const precio = +document.querySelector('#calc-precio').value || 0;
  const cant   = +document.querySelector('#calc-cant').value || 1;

  if(!nombre) return toast('⚠️ Poné un nombre');
  if(precio <= 0) return toast('⚠️ Poné un precio');

  window.calcItems.push({
    id: 'ci_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    nombre,
    precio,
    cantidad: cant
  });

  /* Limpiar inputs */
  document.querySelector('#calc-nombre').value = '';
  document.querySelector('#calc-precio').value = '';
  document.querySelector('#calc-cant').value = '1';
  document.querySelector('#calc-nombre').focus();

  renderCalculadora();
  if(navigator.vibrate) navigator.vibrate(10);
}

function renderCalculadora(){
  const cont = document.querySelector('#calc-lista');
  if(!cont) return;

  const items = window.calcItems || [];

  if(!items.length){
    cont.innerHTML = `
      <div class="calc-vacio">
        <div style="font-size:36px;opacity:.4;margin-bottom:10px">🛒</div>
        <div style="font-size:12px;color:var(--dim);line-height:1.6">
          Todavía no agregaste nada.<br>
          Escribí arriba y tocá el <b>+</b>.
        </div>
      </div>`;
  } else {
    cont.innerHTML = items.map(it => `
      <div class="calc-item">
        <div class="calc-item-info">
          <div class="calc-item-nombre">${esc(it.nombre)}</div>
          <div class="calc-item-meta">${it.cantidad} × ${fmt(it.precio)}</div>
        </div>
        <div class="calc-item-total">${fmt(it.cantidad * it.precio)}</div>
        <button class="calc-item-del" data-del="${it.id}" type="button">✕</button>
      </div>
    `).join('');

    cont.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.calcItems = window.calcItems.filter(x => x.id !== btn.dataset.del);
        renderCalculadora();
      });
    });
  }

  /* Total */
  const total = items.reduce((s, it) => s + it.cantidad * it.precio, 0);
  const totalEl = document.querySelector('#calc-total-valor');
  if(totalEl) totalEl.textContent = fmt(total);

  /* Toggle color si hay items */
  const totalBox = document.querySelector('#calc-total');
  if(totalBox) totalBox.classList.toggle('con-items', items.length > 0);
}

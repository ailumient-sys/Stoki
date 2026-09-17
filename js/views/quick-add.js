/* =========================================================
   views/quick-add.js — Agregar varios productos a la vez
   Cada foto = un producto
   ========================================================= */

window.QA = window.QA || { items: [] };

function abrirQuickAdd(){
  if(document.querySelector('#m-qa-menu')) return;

  const html = `
    <div class="overlay centered open" id="m-qa-menu">
      <div class="sheet" style="max-width:340px;padding:16px">
        <h2 style="text-align:center;margin-bottom:16px">Agregar productos</h2>

        <button class="qa-opt" data-modo="camara" type="button">
          <span class="qa-opt-icon">📷</span>
          <span class="qa-opt-text">
            <span class="qa-opt-title">Tomar fotos</span>
            <span class="qa-opt-sub">Una por una</span>
          </span>
        </button>

        <button class="qa-opt" data-modo="galeria" type="button">
          <span class="qa-opt-icon">🖼️</span>
          <span class="qa-opt-text">
            <span class="qa-opt-title">Elegir fotos</span>
            <span class="qa-opt-sub">Varias de la galería</span>
          </span>
        </button>

        <button class="btn-ghost" id="qa-menu-cancel" style="margin-top:10px">Cancelar</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const cerrar = () => {
    const el = document.querySelector('#m-qa-menu');
    if(el) el.remove();
  };

  document.querySelector('#qa-menu-cancel').addEventListener('click', cerrar);
  document.querySelector('#m-qa-menu').addEventListener('click', e => {
    if(e.target.id === 'm-qa-menu') cerrar();
  });

  document.querySelectorAll('.qa-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const modo = btn.dataset.modo;
      cerrar();
      setTimeout(() => iniciarCaptura(modo), 200);
    });
  });
}

/* Crear input file dinámicamente y capturar */
function iniciarCaptura(modo){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  if(modo === 'camara'){
    input.setAttribute('capture', 'environment');
    input.multiple = false;
  } else {
    input.removeAttribute('capture');
    input.multiple = true;
  }

  input.onchange = async e => {
    const files = [...e.target.files];
    if(!files.length) return;

    /* Si es cámara y ya hay items, seguir agregando uno a uno */
    if(modo === 'camara'){
      for(const file of files){
        try{
          const base64 = await resizeImage(file, 320, 0.62);
          window.QA.items.push({
            id: 'qa_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
            foto: base64,
            nombre: '',
            unidades: '',
            precioVenta: ''
          });
        }catch(err){
          console.error(err);
        }
      }
      /* Reabrir la cámara para la siguiente foto */
      setTimeout(() => {
        if(window.QA.items.length && !document.querySelector('#m-qa-edit')){
          abrirQuickAddEditor();
          setTimeout(() => iniciarCaptura('camara'), 200);
        }
      }, 100);
      return;
    }

    /* Galería: procesar todas */
    toast(`⏳ Procesando ${files.length} foto${files.length !== 1 ? 's' : ''}...`);

    for(const file of files){
      try{
        const base64 = await resizeImage(file, 320, 0.62);
        window.QA.items.push({
          id: 'qa_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          foto: base64,
          nombre: '',
          unidades: '',
          precioVenta: ''
        });
      }catch(err){
        console.error(err);
      }
    }

    setTimeout(() => abrirQuickAddEditor(), 100);
  };

  input.click();
}

/* Editor con la lista de productos */
function abrirQuickAddEditor(){
  if(document.querySelector('#m-qa-edit')) {
    renderQuickAddList();
    return;
  }

  const html = `
    <div class="overlay open" id="m-qa-edit">
      <div class="sheet" style="position:relative">
        <div class="sheet-handle"></div>
        <button class="x" id="qa-close">✕</button>
        <h2>⚡ Agregar ${window.QA.items.length > 0 ? '(' + window.QA.items.length + ')' : ''}</h2>
        <div class="sub">Completá los datos de cada producto.</div>

        <button class="btn-ghost" id="qa-add-mas" style="margin-top:0;margin-bottom:14px">
          📷 Agregar más fotos
        </button>

        <div id="qa-list"></div>

        <button class="btn-main" id="qa-guardar-todos"
                style="margin-top:16px">
          ✅ Guardar todos
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  renderQuickAddList();

  document.querySelector('#qa-close').addEventListener('click', cerrarQuickAddEditor);
  document.querySelector('#m-qa-edit').addEventListener('click', e => {
    if(e.target.id === 'm-qa-edit') cerrarQuickAddEditor();
  });

  document.querySelector('#qa-add-mas').addEventListener('click', () => {
    abrirQuickAdd();
  });

  document.querySelector('#qa-guardar-todos').addEventListener('click', guardarQuickAdd);
}

function cerrarQuickAddEditor(){
  const el = document.querySelector('#m-qa-edit');
  if(el) el.remove();
}

function renderQuickAddList(){
  const cont = document.querySelector('#qa-list');
  if(!cont) return;

  const items = window.QA.items;

  if(!items.length){
    cont.innerHTML = `
      <div class="qa-vacio">
        <div style="font-size:44px;opacity:.35;margin-bottom:12px">📷</div>
        <div style="font-size:13px;color:var(--dim);font-weight:600">
          Agregá fotos para empezar
        </div>
      </div>`;
    return;
  }

  cont.innerHTML = items.map((it, idx) => `
    <div class="qa-card" data-id="${it.id}">
      <div class="qa-thumb" style="background-image:url('${it.foto}')"></div>

      <div class="qa-fields">
        <input class="qa-input qa-nombre" data-id="${it.id}" data-field="nombre"
               placeholder="Nombre" value="${esc(it.nombre)}" autocomplete="off">

        <div class="qa-row2">
          <input class="qa-input qa-num" data-id="${it.id}" data-field="unidades"
                 placeholder="Unid." type="number" inputmode="numeric"
                 value="${it.unidades}">
          <input class="qa-input qa-num" data-id="${it.id}" data-field="precioVenta"
                 placeholder="Precio venta" type="number" inputmode="decimal"
                 value="${it.precioVenta}">
        </div>
      </div>

      <button class="qa-del" data-del="${it.id}" type="button">🗑️</button>
    </div>
  `).join('');

  /* Bind inputs */
  cont.querySelectorAll('.qa-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const it = window.QA.items.find(x => x.id === inp.dataset.id);
      if(it) it[inp.dataset.field] = inp.value;
    });
  });

  /* Bind eliminar */
  cont.querySelectorAll('.qa-del').forEach(btn => {
    btn.addEventListener('click', () => {
      window.QA.items = window.QA.items.filter(x => x.id !== btn.dataset.del);
      renderQuickAddList();
    });
  });

  /* Actualizar título del modal */
  const title = document.querySelector('#m-qa-edit h2');
  if(title) title.textContent = `⚡ Agregar (${items.length})`;
}

async function guardarQuickAdd(){
  const items = window.QA.items;

  if(!items.length){
    return toast('⚠️ No hay productos');
  }

  /* Validar que tengan al menos nombre y precio */
  const invalidos = items.filter(it =>
    !it.nombre.trim() || +it.precioVenta <= 0 || +it.unidades <= 0
  );

  if(invalidos.length){
    return toast(`⚠️ Faltan datos en ${invalidos.length} producto${invalidos.length !== 1 ? 's' : ''}`);
  }

  /* Confirmar */
  const ok = await confirmarAccion({
    titulo: `¿Guardar ${items.length} producto${items.length !== 1 ? 's' : ''}?`,
    mensaje: 'Se agregarán al catálogo con costo 0 (se completa en el primer restock).',
    botonOk: 'Guardar',
    botonCancel: 'Cancelar',
    colorOk: 'verde'
  });

  if(!ok) return;

  let creados = 0;

  for(const it of items){
    try{
      const nuevoId = uid();
      const unidades = +it.unidades || 0;
      const precioVenta = +it.precioVenta || 0;

      const producto = {
        id: nuevoId,
        nombre: it.nombre.trim(),
        fotoPrincipal: 0,
        cantidadFotos: 1,
        tipoMargen: 'precio',
        valorMargen: precioVenta,
        costoDesconocido: true,
        codigoBarras: null,
        restockeable: true,
        creado: Date.now(),
        favorito: false,
        categoriaId: null,
        lotes: [{
          id: 'lote_' + uid(),
          fecha: todayISO(),
          unidadesCompradas: unidades,
          costoTotalCompra: 0,
          costoUnitario: 0,
          costoDesconocido: true
        }],
        ventas: []
      };

      /* Guardar la foto en IndexedDB */
      await guardarFotosProducto(nuevoId, [it.foto]);
      window.FOTOS[nuevoId] = [it.foto];

      window.DB.products.push(producto);
      creados++;
    }catch(err){
      console.warn('Error al crear producto:', err);
    }
  }

  saveDB();
  renderAll();
  cerrarQuickAddEditor();
  window.QA.items = [];

  toast(`✅ ${creados} producto${creados !== 1 ? 's' : ''} agregado${creados !== 1 ? 's' : ''}`);
}

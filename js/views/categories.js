/* =========================================================
   views/categories.js — Gestión de categorías
   ========================================================= */

function obtenerCategorias(){
  return window.DB.categories || [];
}

function buscarCategoria(id){
  if(!id) return null;
  return obtenerCategorias().find(c => c.id === id) || null;
}

function nombreCategoria(producto){
  if(!producto || !producto.categoriaId) return 'Sin categoría';
  const cat = buscarCategoria(producto.categoriaId);
  return cat ? cat.nombre : 'Sin categoría';
}

/* ---------- Modal de gestión ---------- */
function abrirGestionCategorias(){
  if(document.querySelector('#m-categorias')) return;

  const cats = obtenerCategorias();

  const listaHTML = cats.length
    ? cats.map(c => {
        const count = (window.DB.products || []).filter(p => p.categoriaId === c.id).length;
        return `
          <div class="cat-row" data-id="${c.id}">
            <div class="cat-info">
              <div class="cat-nombre">${esc(c.nombre)}</div>
              <div class="cat-count">${count} producto${count !== 1 ? 's' : ''}</div>
            </div>
            <button class="cat-edit" data-edit="${c.id}" type="button">✏️</button>
            <button class="cat-del" data-del="${c.id}" type="button">🗑️</button>
          </div>`;
      }).join('')
    : '<div class="empty" style="padding:30px 10px"><div class="ico">🏷️</div><h3>Sin categorías</h3><p>Creá la primera categoría para organizar tus productos.</p></div>';

  const html = `
    <div class="overlay centered open" id="m-categorias">
      <div class="sheet" style="position:relative">
        <button class="x" id="cat-close">✕</button>
        <h2>🏷️ Categorías</h2>
        <div class="sub">Organizá tus productos por tipo.</div>

        <button class="btn-main" id="cat-nueva" style="margin-top:0;margin-bottom:14px">
          ➕ Nueva categoría
        </button>

        <div id="cat-list">${listaHTML}</div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#cat-close').addEventListener('click', () => {
    document.querySelector('#m-categorias').remove();
  });

  document.querySelector('#m-categorias').addEventListener('click', e => {
    if(e.target.id === 'm-categorias') e.target.remove();
  });

  document.querySelector('#cat-nueva').addEventListener('click', () => {
    abrirFormCategoria(null);
  });

  document.querySelectorAll('.cat-edit').forEach(btn => {
    btn.addEventListener('click', () => abrirFormCategoria(btn.dataset.edit));
  });

  document.querySelectorAll('.cat-del').forEach(btn => {
    btn.addEventListener('click', () => eliminarCategoria(btn.dataset.del));
  });
}

/* ---------- Form crear/editar ---------- */
function abrirFormCategoria(id){
  const editando = !!id;
  const cat = editando ? buscarCategoria(id) : null;

  if(document.querySelector('#m-categoria-form')) return;

  const html = `
    <div class="overlay centered open" id="m-categoria-form" style="z-index:210">
      <div class="sheet" style="position:relative;max-width:340px">
        <button class="x" id="catform-close">✕</button>
        <h2>${editando ? '✏️ Editar' : '🏷️ Nueva'} categoría</h2>

        <label>Nombre</label>
        <input id="catform-nombre" placeholder="Ej: Bebidas"
               value="${editando ? esc(cat.nombre) : ''}"
               autocomplete="off">

        <button class="btn-main" id="catform-save">Guardar</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  setTimeout(() => {
    const inp = document.querySelector('#catform-nombre');
    if(inp) inp.focus();
  }, 200);

  document.querySelector('#catform-close').addEventListener('click', () => {
    document.querySelector('#m-categoria-form').remove();
  });

  document.querySelector('#m-categoria-form').addEventListener('click', e => {
    if(e.target.id === 'm-categoria-form') e.target.remove();
  });

  document.querySelector('#catform-save').addEventListener('click', () => {
    guardarCategoria(id);
  });

  document.querySelector('#catform-nombre').addEventListener('keypress', e => {
    if(e.key === 'Enter') guardarCategoria(id);
  });
}

function guardarCategoria(id){
  const inp = document.querySelector('#catform-nombre');
  const nombre = inp ? inp.value.trim() : '';

  if(!nombre) return toast('⚠️ El nombre es obligatorio');

  const dup = obtenerCategorias().find(c =>
    c.nombre.toLowerCase() === nombre.toLowerCase() && c.id !== id
  );
  if(dup) return toast(`⚠️ Ya existe "${dup.nombre}"`);

  if(!window.DB.categories) window.DB.categories = [];

  if(id){
    const cat = window.DB.categories.find(c => c.id === id);
    if(cat) cat.nombre = nombre;
    toast('✅ Categoría actualizada');
  } else {
    window.DB.categories.push({
      id: 'cat_' + uid(),
      nombre,
      creado: Date.now()
    });
    toast('✅ Categoría creada');
  }

  saveDB();
  document.querySelector('#m-categoria-form').remove();

  if(document.querySelector('#m-categorias')){
    document.querySelector('#m-categorias').remove();
    abrirGestionCategorias();
  }

  if(typeof renderInventario === 'function') renderInventario();
}

async function eliminarCategoria(id){
  const cat = buscarCategoria(id);
  if(!cat) return;

  const count = (window.DB.products || []).filter(p => p.categoriaId === id).length;

  const ok = await confirmarAccion({
    titulo: `¿Eliminar "${cat.nombre}"?`,
    mensaje: count
      ? `${count} producto${count !== 1 ? 's' : ''} quedarán en "Sin categoría".`
      : 'Esta acción no se puede deshacer.',
    botonOk: 'Eliminar',
    botonCancel: 'Cancelar',
    colorOk: 'rojo'
  });

  if(!ok) return;

  (window.DB.products || []).forEach(p => {
    if(p.categoriaId === id) delete p.categoriaId;
  });

  window.DB.categories = window.DB.categories.filter(c => c.id !== id);
  saveDB();

  document.querySelector('#m-categorias').remove();
  abrirGestionCategorias();

  if(typeof renderInventario === 'function') renderInventario();
  toast('🗑️ Categoría eliminada');
}

/* ---------- Selector para el form de producto ---------- */
function abrirSelectorCategoria(onSelect){
  if(document.querySelector('#m-cat-selector')) return;

  const cats = obtenerCategorias();

  const listaHTML = cats.length
    ? cats.map(c => `
        <div class="cat-pick-row" data-id="${c.id}">
          <span>🏷️</span>
          <span>${esc(c.nombre)}</span>
        </div>`).join('')
    : '';

  const html = `
    <div class="overlay centered open" id="m-cat-selector" style="z-index:210">
      <div class="sheet" style="position:relative;max-width:360px">
        <button class="x" id="catsel-close">✕</button>
        <h2>🏷️ Categoría</h2>

        <div class="cat-pick-list">
          <div class="cat-pick-row" data-id="">
            <span>🚫</span>
            <span>Sin categoría</span>
          </div>
          ${listaHTML}
        </div>

        <button class="btn-ghost" id="catsel-nueva" style="margin-top:12px">
          ➕ Crear nueva categoría
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#catsel-close').addEventListener('click', () => {
    document.querySelector('#m-cat-selector').remove();
  });

  document.querySelector('#m-cat-selector').addEventListener('click', e => {
    if(e.target.id === 'm-cat-selector') e.target.remove();
  });

  document.querySelectorAll('.cat-pick-row').forEach(row => {
    row.addEventListener('click', () => {
      onSelect(row.dataset.id || null);
      document.querySelector('#m-cat-selector').remove();
    });
  });

  document.querySelector('#catsel-nueva').addEventListener('click', () => {
    document.querySelector('#m-cat-selector').remove();
    abrirFormCategoria(null);
  });
}

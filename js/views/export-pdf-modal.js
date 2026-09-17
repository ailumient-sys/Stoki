/* =========================================================
   views/export-pdf-modal.js — Modal unificado de exportación
   ========================================================= */

window.expOpciones = {
  tipo: 'catalogo',        /* 'inventario' | 'catalogo' | 'ambos' */
  columnas: 2,
  filas: 3,
  separarCategorias: false,
  imagenFondo: null,       /* base64 o null */
  imagenFondoNombre: null,
};

function abrirModalExportPDF(){
  if(document.querySelector('#m-export-pdf')) return;

  const html = `
    <div class="overlay centered open exp-modal" id="m-export-pdf">
      <div class="sheet" style="position:relative">
        <button class="x" id="expm-close">✕</button>
        <h2>📄 Exportar PDF</h2>
        <div class="sub">Personalizá el archivo antes de generarlo.</div>

        <!-- Tipo -->
        <div class="exp-section">
          <div class="exp-section-title">¿Qué querés exportar?</div>
          <div class="exp-tipo-grid" id="expm-tipo">
            <button class="exp-tipo-btn" data-tipo="catalogo">
              <span class="icon">🖼️</span> Catálogo
            </button>
            <button class="exp-tipo-btn" data-tipo="inventario">
              <span class="icon">📊</span> Inventario
            </button>
            <button class="exp-tipo-btn" data-tipo="ambos">
              <span class="icon">📚</span> Ambos
            </button>
          </div>
        </div>

        <!-- Columnas -->
        <div class="exp-section" id="expm-cols-section">
          <div class="exp-section-title">Columnas</div>
          <div class="exp-num-grid" id="expm-cols">
            <button class="exp-num-btn" data-val="1">1</button>
            <button class="exp-num-btn" data-val="2">2</button>
            <button class="exp-num-btn" data-val="3">3</button>
            <button class="exp-num-btn" data-val="4">4</button>
          </div>
        </div>

        <!-- Filas -->
        <div class="exp-section" id="expm-filas-section">
          <div class="exp-section-title">Productos por página</div>
          <div class="exp-num-grid" id="expm-filas">
            <button class="exp-num-btn" data-val="3">3</button>
            <button class="exp-num-btn" data-val="4">4</button>
            <button class="exp-num-btn" data-val="6">6</button>
            <button class="exp-num-btn" data-val="8">8</button>
            <button class="exp-num-btn" data-val="9">9</button>
          </div>
        </div>

        <!-- Separar por categoría -->
        <div class="exp-section">
          <div class="exp-toggle" id="expm-sep-cat">
            <div>
              <div class="exp-toggle-label">🏷️ Separar por categoría</div>
              <div class="exp-toggle-sub">Cada categoría empieza en una página nueva</div>
            </div>
            <div class="exp-toggle-switch"></div>
          </div>
        </div>

        <!-- Imagen de fondo -->
        <div class="exp-section">
          <div class="exp-section-title">Imagen de fondo (opcional)</div>
          <div class="exp-bg-preview" id="expm-bg-preview">
            <div class="exp-bg-thumb" id="expm-bg-thumb">🖼️</div>
            <div class="exp-bg-info">
              <div class="exp-bg-nombre" id="expm-bg-nombre">Sin imagen</div>
              <div class="exp-bg-sub">Tu logo Stoki siempre va encima</div>
            </div>
            <button class="exp-bg-btn" id="expm-bg-pick">Elegir</button>
            <button class="exp-bg-btn danger" id="expm-bg-del" style="display:none">✕</button>
          </div>
          <input type="file" id="expm-bg-file" accept="image/*" style="display:none">
        </div>

        <button class="btn-main" id="expm-generar">
          📤 Generar PDF
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  bindModalExportPDF();
  actualizarModalExportPDF();
}

function bindModalExportPDF(){
  document.querySelector('#expm-close').addEventListener('click', cerrarModalExportPDF);
  document.querySelector('#m-export-pdf').addEventListener('click', e => {
    if(e.target.id === 'm-export-pdf') cerrarModalExportPDF();
  });

  /* Tipo */
  document.querySelectorAll('#expm-tipo .exp-tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      expOpciones.tipo = btn.dataset.tipo;
      actualizarModalExportPDF();
    });
  });

  /* Columnas */
  document.querySelectorAll('#expm-cols .exp-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      expOpciones.columnas = +btn.dataset.val;
      actualizarModalExportPDF();
    });
  });

  /* Filas */
  document.querySelectorAll('#expm-filas .exp-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      expOpciones.filas = +btn.dataset.val;
      actualizarModalExportPDF();
    });
  });

  /* Separar categorías */
  document.querySelector('#expm-sep-cat').addEventListener('click', () => {
    expOpciones.separarCategorias = !expOpciones.separarCategorias;
    actualizarModalExportPDF();
  });

  /* Imagen fondo */
  document.querySelector('#expm-bg-pick').addEventListener('click', () => {
    document.querySelector('#expm-bg-file').click();
  });

  document.querySelector('#expm-bg-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if(!file) return;
    try{
      const base64 = await resizeImage(file, 1200, 0.75);
      expOpciones.imagenFondo = base64;
      expOpciones.imagenFondoNombre = file.name;
      actualizarModalExportPDF();
    }catch(err){
      console.error(err);
      toast('⚠️ No se pudo procesar la imagen');
    }
    e.target.value = '';
  });

  document.querySelector('#expm-bg-del').addEventListener('click', () => {
    expOpciones.imagenFondo = null;
    expOpciones.imagenFondoNombre = null;
    actualizarModalExportPDF();
  });

  /* Generar */
  document.querySelector('#expm-generar').addEventListener('click', () => {
    cerrarModalExportPDF();
    if(expOpciones.tipo === 'catalogo'){
      exportarConOpciones('catalogo');
    } else if(expOpciones.tipo === 'inventario'){
      exportarConOpciones('inventario');
    } else {
      exportarConOpciones('ambos');
    }
  });
}

function actualizarModalExportPDF(){
  /* Tipo */
  document.querySelectorAll('#expm-tipo .exp-tipo-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tipo === expOpciones.tipo);
  });

  /* Columnas */
  document.querySelectorAll('#expm-cols .exp-num-btn').forEach(btn => {
    btn.classList.toggle('active', +btn.dataset.val === expOpciones.columnas);
  });

  /* Filas */
  document.querySelectorAll('#expm-filas .exp-num-btn').forEach(btn => {
    btn.classList.toggle('active', +btn.dataset.val === expOpciones.filas);
  });

  /* Mostrar/ocultar cols y filas según tipo */
  const colsSec = document.querySelector('#expm-cols-section');
  const filasSec = document.querySelector('#expm-filas-section');
  const esSoloInventario = expOpciones.tipo === 'inventario';

  if(colsSec) colsSec.style.display = esSoloInventario ? 'none' : 'block';
  if(filasSec) filasSec.style.display = esSoloInventario ? 'none' : 'block';

  /* Separar categorías */
  const sepCat = document.querySelector('#expm-sep-cat');
  sepCat.classList.toggle('on', expOpciones.separarCategorias);

  /* Imagen fondo */
  const thumb = document.querySelector('#expm-bg-thumb');
  const nombre = document.querySelector('#expm-bg-nombre');
  const del = document.querySelector('#expm-bg-del');

  if(expOpciones.imagenFondo){
    thumb.style.backgroundImage = `url('${expOpciones.imagenFondo}')`;
    thumb.textContent = '';
    nombre.textContent = expOpciones.imagenFondoNombre || 'imagen.jpg';
    del.style.display = 'block';
  } else {
    thumb.style.backgroundImage = '';
    thumb.textContent = '🖼️';
    nombre.textContent = 'Sin imagen';
    del.style.display = 'none';
  }
}

function cerrarModalExportPDF(){
  const el = document.querySelector('#m-export-pdf');
  if(el) el.remove();
}

/* Llamada desde el botón unificado */
function abrirExportUnificado(){
  abrirModalExportPDF();
}

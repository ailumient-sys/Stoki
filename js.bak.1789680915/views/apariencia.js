/* =========================================================
   views/apariencia.js — Sistema de temas
   ========================================================= */

const APARIENCIA_PRESETS = [
  { id: 'verde',   nombre: 'Verde',   header: 'linear-gradient(135deg, #22c55e, #16a34a)' },
  { id: 'azul',    nombre: 'Azul',    header: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { id: 'morado',  nombre: 'Morado',  header: 'linear-gradient(135deg, #a855f7, #7c3aed)' },
  { id: 'naranja', nombre: 'Naranja', header: 'linear-gradient(135deg, #f97316, #ea580c)' },
  { id: 'rosa',    nombre: 'Rosa',    header: 'linear-gradient(135deg, #ec4899, #be185d)' },
  { id: 'rojo',    nombre: 'Rojo',    header: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  { id: 'cyan',    nombre: 'Cyan',    header: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
  { id: 'dorado',  nombre: 'Dorado',  header: 'linear-gradient(135deg, #fbbf24, #d97706)' },
  { id: 'oscuro',  nombre: 'Oscuro',  header: 'linear-gradient(135deg, #1e2430, #0f1115)' },
];

function aparienciaDefault(){
  return {
    preset: 'verde',
    headerTipo: 'gradient',
    headerValor: APARIENCIA_PRESETS[0].header,
    fondoColor: null,
    imagenHeader: null,
    imagenFondo: null,
    opacidad: 0.72
  };
}

function obtenerApariencia(){
  if(!window.DB.settings.apariencia){
    window.DB.settings.apariencia = aparienciaDefault();
  }
  return window.DB.settings.apariencia;
}

function aplicarApariencia(){
  const ap = obtenerApariencia();
  const html = document.documentElement;

  /* Header */
  if(ap.imagenHeader){
    html.style.setProperty('--header-bg',
      `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url('${ap.imagenHeader}')`);
    html.style.setProperty('--header-bg-size', 'cover');
    html.style.setProperty('--header-bg-pos', 'center');
  } else if(ap.headerTipo === 'gradient'){
    html.style.setProperty('--header-bg', ap.headerValor);
    html.style.setProperty('--header-bg-size', 'auto');
  } else if(ap.headerTipo === 'color'){
    html.style.setProperty('--header-bg', ap.headerValor);
    html.style.setProperty('--header-bg-size', 'auto');
  } else {
    html.style.removeProperty('--header-bg');
  }

  /* Fondo */
  if(ap.imagenFondo){
    html.style.setProperty('--app-bg-image', `url('${ap.imagenFondo}')`);
    html.style.setProperty('--app-bg-color', '#0f1115');
  } else {
    html.style.removeProperty('--app-bg-image');
    if(ap.fondoColor){
      html.style.setProperty('--app-bg-color', ap.fondoColor);
    } else {
      html.style.removeProperty('--app-bg-color');
    }
  }

  /* Opacidad dinámica de los elementos */
  const op = (typeof ap.opacidad === 'number') ? ap.opacidad : 0.72;
  document.body.style.setProperty('--ap-op', op);

  /* Toggle clase para que el CSS se aplique */
  document.body.classList.add('tema-custom');
  const header = document.querySelector('header');
  if(header) header.classList.add('tema-custom');
}

/* =========================================================
   MODAL DE APARIENCIA
   ========================================================= */
function abrirApariencia(){
  if(document.querySelector('#m-apariencia')) return;

  const ap = obtenerApariencia();

  const presetsHTML = APARIENCIA_PRESETS.map(p => `
    <button class="ap-prev ${ap.preset === p.id ? 'active' : ''}"
            data-preset="${p.id}" type="button"
            style="background:${p.header}">
      <span>${p.nombre}</span>
    </button>
  `).join('');

  const html = `
    <div class="overlay centered open ap-modal" id="m-apariencia">
      <div class="sheet" style="position:relative">
        <button class="x" id="ap-close">✕</button>
        <h2>🎨 Apariencia</h2>
        <div class="sub">Personalizá el header y el fondo de la app.</div>

        <div class="ap-section">
          <div class="ap-section-title">Gradientes</div>
          <div class="ap-presets">${presetsHTML}</div>
        </div>

        <div class="ap-section">
          <div class="ap-section-title">Imagen de fondo (opcional)</div>
          <div class="ap-img-row">
            <div class="ap-img-thumb ${ap.imagenFondo ? 'lleno' : ''}"
                 id="ap-thumb-fondo"
                 style="${ap.imagenFondo ? `background-image:url('${ap.imagenFondo}')` : ''}">
              ${ap.imagenFondo ? '' : '🖼️'}
            </div>
            <div class="ap-img-info">
              <div class="ap-img-nombre">Fondo de la app</div>
              <div class="ap-img-sub">Reemplaza el fondo oscuro</div>
            </div>
            <button class="ap-img-btn" id="ap-pick-fondo" type="button">Elegir</button>
            ${ap.imagenFondo ? '<button class="ap-img-btn danger" id="ap-del-fondo" type="button">✕</button>' : ''}
          </div>
        </div>

        <div class="ap-section">
          <div class="ap-section-title">Imagen del header (opcional)</div>
          <div class="ap-img-row">
            <div class="ap-img-thumb ${ap.imagenHeader ? 'lleno' : ''}"
                 id="ap-thumb-header"
                 style="${ap.imagenHeader ? `background-image:url('${ap.imagenHeader}')` : ''}">
              ${ap.imagenHeader ? '' : '🖼️'}
            </div>
            <div class="ap-img-info">
              <div class="ap-img-nombre">Fondo del header</div>
              <div class="ap-img-sub">Reemplaza el gradiente</div>
            </div>
            <button class="ap-img-btn" id="ap-pick-header" type="button">Elegir</button>
            ${ap.imagenHeader ? '<button class="ap-img-btn danger" id="ap-del-header" type="button">✕</button>' : ''}
          </div>
        </div>

        <div class="ap-section">
          <div class="ap-section-title">Opacidad de los elementos</div>
          <div class="ap-slider-row">
            <div class="ap-slider-top">
              <span class="ap-slider-label">Transparencia</span>
              <span class="ap-slider-valor" id="ap-op-valor">${Math.round((ap.opacidad || 0.72) * 100)}%</span>
            </div>
            <input type="range" class="ap-slider" id="ap-slider-op"
                   min="30" max="100" step="1"
                   value="${Math.round((ap.opacidad || 0.72) * 100)}">
            <div class="ap-slider-hint">Menos % = más transparente la imagen de fondo se ve</div>
          </div>
        </div>

        <button class="btn-ghost btn-danger" id="ap-reset" style="margin-top:16px">
          🔄 Restaurar por defecto
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#ap-close').addEventListener('click', cerrarApariencia);
  document.querySelector('#m-apariencia').addEventListener('click', e => {
    if(e.target.id === 'm-apariencia') cerrarApariencia();
  });

  /* Presets */
  document.querySelectorAll('.ap-prev').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = APARIENCIA_PRESETS.find(p => p.id === btn.dataset.preset);
      if(!preset) return;
      const ap = obtenerApariencia();
      ap.preset = preset.id;
      ap.headerTipo = 'gradient';
      ap.headerValor = preset.header;
      ap.imagenHeader = null;
      saveDB();
      aplicarApariencia();
      document.querySelector('#m-apariencia').remove();
      abrirApariencia();
    });
  });

  /* Imagen fondo */
  const inpFondo = document.createElement('input');
  inpFondo.type = 'file';
  inpFondo.accept = 'image/*';
  inpFondo.style.display = 'none';
  document.body.appendChild(inpFondo);

  const inpHeader = document.createElement('input');
  inpHeader.type = 'file';
  inpHeader.accept = 'image/*';
  inpHeader.style.display = 'none';
  document.body.appendChild(inpHeader);

  document.querySelector('#ap-pick-fondo').addEventListener('click', () => inpFondo.click());
  document.querySelector('#ap-pick-header').addEventListener('click', () => inpHeader.click());

  inpFondo.addEventListener('change', async e => {
    const f = e.target.files[0];
    if(!f) return;
    try{
      const base64 = await resizeImage(f, 1400, 0.75);
      const ap = obtenerApariencia();
      ap.imagenFondo = base64;
      saveDB();
      aplicarApariencia();
      document.querySelector('#m-apariencia').remove();
      abrirApariencia();
      toast('✅ Fondo aplicado');
    }catch(err){
      console.error(err);
      toast('⚠️ No se pudo cargar la imagen');
    }
    e.target.value = '';
  });

  inpHeader.addEventListener('change', async e => {
    const f = e.target.files[0];
    if(!f) return;
    try{
      const base64 = await resizeImage(f, 1200, 0.75);
      const ap = obtenerApariencia();
      ap.imagenHeader = base64;
      saveDB();
      aplicarApariencia();
      document.querySelector('#m-apariencia').remove();
      abrirApariencia();
      toast('✅ Header aplicado');
    }catch(err){
      console.error(err);
      toast('⚠️ No se pudo cargar la imagen');
    }
    e.target.value = '';
  });

  const delFondo = document.querySelector('#ap-del-fondo');
  if(delFondo){
    delFondo.addEventListener('click', () => {
      const ap = obtenerApariencia();
      ap.imagenFondo = null;
      saveDB();
      aplicarApariencia();
      document.querySelector('#m-apariencia').remove();
      abrirApariencia();
    });
  }

  const delHeader = document.querySelector('#ap-del-header');
  if(delHeader){
    delHeader.addEventListener('click', () => {
      const ap = obtenerApariencia();
      ap.imagenHeader = null;
      saveDB();
      aplicarApariencia();
      document.querySelector('#m-apariencia').remove();
      abrirApariencia();
    });
  }

  /* Slider de opacidad (tiempo real) */
  const slider = document.querySelector('#ap-slider-op');
  const valorLabel = document.querySelector('#ap-op-valor');

  if(slider){
    slider.addEventListener('input', () => {
      const pct = +slider.value;
      const op = pct / 100;

      /* Actualizar el label */
      if(valorLabel) valorLabel.textContent = pct + '%';

      /* Actualizar la variable CSS en vivo */
      document.body.style.setProperty('--ap-op', op);

      /* Actualizar el gradiente del slider */
      slider.style.background = `linear-gradient(to right, var(--green) 0%, var(--green) ${pct}%, var(--bg4) ${pct}%, var(--bg4) 100%)`;

      /* Guardar en DB (sin renderizar todo) */
      const ap = obtenerApariencia();
      ap.opacidad = op;
      saveDB();
    });
  }

  /* Reset */
  document.querySelector('#ap-reset').addEventListener('click', () => {
    window.DB.settings.apariencia = aparienciaDefault();
    saveDB();
    aplicarApariencia();
    document.querySelector('#m-apariencia').remove();
    toast('✅ Apariencia restaurada');
  });

  /* Inicializar el gradiente del slider */
  if(slider){
    const pct = +slider.value;
    slider.style.background = `linear-gradient(to right, var(--green) 0%, var(--green) ${pct}%, var(--bg4) ${pct}%, var(--bg4) 100%)`;
  }

  /* Limpiar inputs al cerrar */
  const limpiar = () => {
    inpFondo.remove();
    inpHeader.remove();
  };
  document.querySelector('#ap-close').addEventListener('click', limpiar);
  document.querySelector('#m-apariencia').addEventListener('click', e => {
    if(e.target.id === 'm-apariencia') limpiar();
  });
}

function cerrarApariencia(){
  const el = document.querySelector('#m-apariencia');
  if(el) el.remove();
}

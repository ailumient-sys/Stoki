/* onboarding.js — Bienvenida completa (8 slides) */

const ONBOARDING_KEY = 'stoki_onboarding_visto';

function shouldShowOnboarding(){
  try{ return !localStorage.getItem(ONBOARDING_KEY); }
  catch(e){ return false; }
}

function marcarOnboardingVisto(){
  try{ localStorage.setItem(ONBOARDING_KEY, '1'); }
  catch(e){}
}

function initOnboarding(){
  if(!shouldShowOnboarding()) return;
  setTimeout(() => crearOnboarding(), 400);
}

function crearOnboarding(){
  if(document.querySelector('#onboarding')) return;

  const slides = [
    {
      icon: '👋',
      titulo: 'Bienvenido a Stoki',
      texto: 'La app para llevar tu negocio desde el teléfono. Sin internet, sin registro, sin mensualidades.'
    },
    {
      icon: '📦',
      titulo: 'Cargá tu inventario',
      texto: 'Productos, materiales, recetas o servicios. Cada tipo tiene lo que necesita. Podés agregar fotos, códigos de barras y precios en distintos formatos.'
    },
    {
      icon: '🛒',
      titulo: 'Vendé rápido',
      texto: 'Tocás los productos y se suman al carrito. Cobrá en efectivo, débito o Pago Móvil con tu QR. También podés escanear productos con la cámara.'
    },
    {
      icon: '📋',
      titulo: 'Pedidos y citas',
      texto: 'Registrá pedidos con reserva automática de stock. Para servicios, agendá citas y llevalas por día.'
    },
    {
      icon: '📊',
      titulo: 'Cierre del día',
      texto: 'Al terminar, ves cuánto facturaste, cuánto ganaste y qué se vendió más. Exportable como libro contable en PDF.'
    },
    {
      icon: '📈',
      titulo: 'Estadísticas reales',
      texto: 'Sabés cuánto ganás por tipo, cuál producto te deja más y cuánto te falta para recuperar tu inversión.'
    },
    {
      icon: '🔒',
      titulo: 'Tus datos son tuyos',
      texto: 'Todo vive en tu teléfono. No se sube a ninguna nube, no hay anuncios y no necesitás internet para usarla.'
    },
    {
      icon: '🚀',
      titulo: '¡Listo para empezar!',
      texto: 'Del menú "Más" podés acceder a todas las funciones. Y si te quedás trabado, está la sección de Ayuda.'
    }
  ];

  const html = `
    <div id="onboarding" class="onboarding">
      <button class="onb-skip" id="onb-skip" type="button">Saltar todo →</button>

      <div class="onb-track" id="onb-track">
        ${slides.map(s => `
          <div class="onb-slide">
            <div class="onb-icon">${s.icon}</div>
            <h2>${s.titulo}</h2>
            <p>${s.texto}</p>
          </div>
        `).join('')}
      </div>

      <div class="onb-dots" id="onb-dots">
        ${slides.map((_, i) =>
          `<span class="${i === 0 ? 'active' : ''}"></span>`
        ).join('')}
      </div>

      <button class="btn-main" id="onb-next" style="margin-top:0">Siguiente</button>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  let idx = 0;
  const track = document.querySelector('#onb-track');
  const dots  = document.querySelectorAll('#onb-dots span');
  const btn   = document.querySelector('#onb-next');
  const btnSkip = document.querySelector('#onb-skip');

  function updateUI(){
    track.scrollTo({ left: idx * track.clientWidth, behavior:'smooth' });
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    btn.textContent = (idx === slides.length - 1) ? '✅ Empezar a usar Stoki' : 'Siguiente';
    btnSkip.style.display = (idx === slides.length - 1) ? 'none' : '';
  }

  btn.addEventListener('click', () => {
    if(idx < slides.length - 1){
      idx++;
      updateUI();
    } else {
      cerrarOnboarding();
    }
  });

  btnSkip.addEventListener('click', () => {
    cerrarOnboarding();
    toast('💡 Podés ver el tour cuando quieras');
  });

  /* Dots táctiles */
  dots.forEach((d, i) => {
    d.addEventListener('click', () => {
      idx = i;
      updateUI();
    });
  });

  /* Swipe */
  let startX = 0;
  track.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
  }, { passive:true });

  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if(Math.abs(dx) < 50) return;
    if(dx < 0 && idx < slides.length - 1) idx++;
    if(dx > 0 && idx > 0) idx--;
    updateUI();
  }, { passive:true });
}

function cerrarOnboarding(){
  marcarOnboardingVisto();
  const el = document.querySelector('#onboarding');
  if(!el) return;
  el.style.transition = 'opacity .3s';
  el.style.opacity = '0';
  setTimeout(() => el.remove(), 300);
}

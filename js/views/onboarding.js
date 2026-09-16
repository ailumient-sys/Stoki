/* =========================================================
   views/onboarding.js — Bienvenida (3 slides)
   Solo aparece la primera vez.
   ========================================================= */

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
    { icon:'👋', titulo:'Bienvenido a Stoki',
      texto:'Tu app para controlar inventario, ventas y ganancias reales.' },
    { icon:'💰', titulo:'Sabé cuánto ganás',
      texto:'Registrá cada compra, calculá tu inversión y mirá cuánto te falta recuperarla.' },
    { icon:'🚀', titulo:'Empezá ahora',
      texto:'Agregá tu primer producto desde Inventario y empezá a vender.' }
  ];

  const html = `
    <div id="onboarding" class="onboarding">
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
      <button class="btn-main" id="onb-next">Siguiente</button>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  let idx = 0;
  const track = document.querySelector('#onb-track');
  const dots  = document.querySelectorAll('#onb-dots span');
  const btn   = document.querySelector('#onb-next');

  function updateUI(){
    track.scrollTo({ left: idx * track.clientWidth, behavior:'smooth' });
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    btn.textContent = (idx === slides.length - 1) ? '✅ Empezar' : 'Siguiente';
  }

  btn.addEventListener('click', () => {
    if(idx < slides.length - 1){
      idx++;
      updateUI();
    } else {
      cerrarOnboarding();
    }
  });

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
/* =========================================================
   views/tasa-aviso.js — Aviso de tasa vieja (diario)
   ========================================================= */

function verificarTasaVieja(){
  const s = window.DB.settings;
  const tasa = Number(s.tasaDia) || 0;

  /* Si no hay tasa cargada, avisar */
  if(tasa <= 0){
    mostrarAvisoTasa('sin-tasa');
    return;
  }

  /* Si nunca se actualizó, avisar */
  if(!s.tasaActualizada){
    mostrarAvisoTasa('sin-fecha');
    return;
  }

  const ultima = new Date(s.tasaActualizada);
  const hoy = new Date();
  const diasDiferencia = Math.floor((hoy - ultima) / 86400000);

  /* Si se actualizó hoy o ayer, no molestar */
  if(diasDiferencia < 1) return;

  mostrarAvisoTasa('vieja', diasDiferencia);
}

function mostrarAvisoTasa(tipo, dias){
  if(document.querySelector('#tasa-aviso')) return;

  let mensaje, icono, color;

  if(tipo === 'sin-tasa'){
    mensaje = 'No cargaste la tasa del día';
    icono = '💱';
    color = 'amber';
  } else if(tipo === 'sin-fecha'){
    mensaje = 'Actualizá la tasa del día';
    icono = '💱';
    color = 'amber';
  } else {
    const d = dias === 1 ? 'día' : 'días';
    mensaje = `Tasa desactualizada hace ${dias} ${d}`;
    icono = '⚠️';
    color = 'red';
  }

  const html = `
    <div class="tasa-aviso ${color}" id="tasa-aviso">
      <div class="tasa-aviso-icon">${icono}</div>
      <div class="tasa-aviso-text">${mensaje}</div>
      <button class="tasa-aviso-btn" id="tasa-aviso-btn" type="button">
        Actualizar
      </button>
      <button class="tasa-aviso-close" id="tasa-aviso-close" type="button">✕</button>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const cerrar = () => {
    const el = document.querySelector('#tasa-aviso');
    if(el) el.remove();
    /* Recordar que se cerró hoy */
    try{
      localStorage.setItem('stoki_tasa_aviso_visto', new Date().toISOString().slice(0,10));
    }catch(e){}
  };

  document.querySelector('#tasa-aviso-btn').addEventListener('click', () => {
    cerrar();
    if(typeof openTasaModal === 'function') openTasaModal();
  });

  document.querySelector('#tasa-aviso-close').addEventListener('click', cerrar);
}

/* ── Chequeo diario ── */
function initTasaAviso(){
  /* Si hoy ya lo cerró, no mostrar */
  try{
    const visto = localStorage.getItem('stoki_tasa_aviso_visto');
    const hoy = new Date().toISOString().slice(0,10);
    if(visto === hoy) return;
  }catch(e){}

  /* Chequear al inicio */
  setTimeout(() => verificarTasaVieja(), 3000);

  /* Y cada 30 min por si la app queda abierta todo el día */
  setInterval(verificarTasaVieja, 30 * 60 * 1000);
}

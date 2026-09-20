// js/views/ocr-camara.js — Stoki v15
// Modal cámara + OCR + loop de captura para Carga Rápida.

window.OcrCamara = (() => {
  let activo = false;
  let onFila = null;   // callback(fotoDataUrl, texto)

  function abrir(cb) {
    onFila = cb;
    activo = true;
    document.getElementById('ocrFab')?.classList.remove('activo');
    document.getElementById('ocrModal').classList.add('open');
  }

  function cerrar() {
    activo = false;
    document.getElementById('ocrModal').classList.remove('open');
    if(document.querySelector('#m-carga-rapida')){
      document.getElementById('ocrFab')?.classList.add('activo');
    }
    onFila = null;
  }

  function info(txt) {
    const el = document.getElementById('ocrInfo');
    if (el) el.innerHTML = txt;
  }

  async function capturar() {
    document.getElementById('ocrFile').click();
  }

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;

    info('Procesando...');
    try {
      const r = await window.Ocr.reconocerProducto(file);
      const nombre = (r.texto || '').split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
      if (onFila) onFila(r.fotoDataUrl, nombre);
      info(nombre ? '✅ ' + nombre : 'No pude leer el nombre');
    } catch (err) {
      info('Error: ' + err);
    }

    // Loop: reabrir cámara sola
    if (activo) setTimeout(capturar, 600);
  }

  function init() {
    document.getElementById('ocrCerrar')?.addEventListener('click', cerrar);
    document.getElementById('ocrCapturar')?.addEventListener('click', capturar);
    document.getElementById('ocrListo')?.addEventListener('click', cerrar);
    document.getElementById('ocrFile')?.addEventListener('change', onFile);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { abrir, cerrar, activo: () => activo };
})();

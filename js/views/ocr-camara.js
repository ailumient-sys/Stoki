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
    await new Promise(r => setTimeout(r, 250));
    try {
      const r = await window.Ocr.reconocerProducto(file);
      const nombre = (r.texto || '').split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
      if (onFila) onFila(r.fotoDataUrl, nombre);

      if (r.ok && nombre) {
        info('✅ ' + nombre);
      } else if (r.ok) {
        info('Sin texto — escribí el nombre');
      } else {
        const P = (window.Capacitor && Capacitor.Plugins) || {};
        const keys = Object.keys(P).join(', ') || '(ninguno)';
        const hasC = !!window.Capacitor;
        info('⚠️ ' + r.error + '<br><span style="font-size:11px;color:#9ca3af">Capacitor: ' + hasC + ' · Plugins: ' + keys + '</span>');
      }
    } catch (err) {
      info('Error: ' + (err && err.message ? err.message : err));
    }

    if (activo) setTimeout(capturar, 1800);
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

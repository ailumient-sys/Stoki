// js/views/ocr-camara.js — Stoki v15
// Cámara en vivo + OCR continuo para Carga Rápida.

window.OcrCamara = (() => {
  let stream = null;
  let activo = false;
  let onFila = null;
  let capturando = false;

  function info(txt){
    const el = document.getElementById('ocrInfo');
    if(el) el.innerHTML = txt;
  }

  async function iniciarCamara(){
    const video = document.getElementById('ocrVideo');
    if(!video) return;

    try{
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      video.srcObject = stream;
      await video.play().catch(() => {});
      info('Apuntá al nombre del producto');
    }catch(e){
      info('⚠️ Sin cámara: ' + (e.message || e.name));
    }
  }

  function detenerCamara(){
    if(stream){
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    const video = document.getElementById('ocrVideo');
    if(video) video.srcObject = null;
  }

  async function abrir(cb){
    onFila = cb;
    activo = true;
    document.getElementById('ocrFab')?.classList.remove('activo');
    document.getElementById('ocrModal').classList.add('open');
    await iniciarCamara();
  }

  function cerrar(){
    activo = false;
    detenerCamara();
    document.getElementById('ocrModal').classList.remove('open');
    if(document.querySelector('#m-carga-rapida')){
      document.getElementById('ocrFab')?.classList.add('activo');
    }
    onFila = null;
  }

  async function capturar(){
    if(capturando) return;
    const video = document.getElementById('ocrVideo');
    if(!video || !video.videoWidth){
      info('⚠️ Cámara no lista');
      return;
    }

    capturando = true;
    info('Procesando...');

    try{
      const w = video.videoWidth;
      const h = video.videoHeight;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(video, 0, 0, w, h);

      const dataUrl = c.toDataURL('image/jpeg', 0.85);
      const r = await window.Ocr.reconocerProducto(dataUrl);
      const nombre = (r.texto || '').split('\n').map(s => s.trim()).filter(Boolean)[0] || '';

      if(onFila) onFila(r.fotoDataUrl, nombre);

      if(r.ok && nombre) info('✅ ' + nombre);
      else if(r.ok) info('Sin texto — escribí el nombre');
      else {
        const P = (window.Capacitor && Capacitor.Plugins) || {};
        info('⚠️ ' + r.error + '<br><span style="font-size:11px;color:#9ca3af">Plugins: ' + Object.keys(P).join(', ') + '</span>');
      }
    }catch(err){
      info('Error: ' + (err && err.message ? err.message : err));
    }finally{
      capturando = false;
    }
  }

  function init(){
    document.getElementById('ocrCerrar')?.addEventListener('click', cerrar);
    document.getElementById('ocrCapturar')?.addEventListener('click', capturar);
    document.getElementById('ocrListo')?.addEventListener('click', cerrar);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { abrir, cerrar, activo: () => activo };
})();

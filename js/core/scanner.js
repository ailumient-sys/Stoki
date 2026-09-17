/* =========================================================
   core/scanner.js — escáner de códigos de barras
   v12: solicita permiso de cámara explícitamente
   ========================================================= */

let scannerInstance = null;
let scannerCallback = null;

/* Abrir el modal de escaneo con un callback */
async function openScanner(callback){
  scannerCallback = callback || null;

  /* Pedir permiso de cámara antes de abrir el modal */
  const tienePermiso = await solicitarPermisoCamara();
  if(!tienePermiso){
    toast('⚠️ Necesitás dar permiso a la cámara');
    return;
  }

  openModal('#m-scan');
  setTimeout(() => startScanner(), 250);
}

/* Solicitar permiso de cámara (funciona en Chrome y APK) */
async function solicitarPermisoCamara(){
  try{
    /* Intentar con la API del navegador */
    if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
      try{
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        /* Detener inmediatamente, solo queríamos el permiso */
        stream.getTracks().forEach(t => t.stop());
        return true;
      }catch(e){
        if(e.name === 'NotAllowedError'){
          toast('📷 Permití la cámara en los ajustes de la app');
          return false;
        }
        /* Otros errores: seguir igual (puede ser que el permiso ya esté dado) */
        return true;
      }
    }

    return true;
  }catch(e){
    console.warn('Error al pedir permiso de cámara:', e);
    return true;
  }
}

/* Iniciar la cámara */
async function startScanner(){
  const cont = $('#scanner-reader');
  if(!cont) return;

  if(typeof Html5Qrcode === 'undefined'){
    toast('⚠️ Escáner no disponible');
    closeScanner();
    return;
  }

  if(scannerInstance){
    try{ await scannerInstance.stop(); }catch(e){}
    try{ scannerInstance.clear(); }catch(e){}
    scannerInstance = null;
  }

  try{
    scannerInstance = new Html5Qrcode('scanner-reader');

    await scannerInstance.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.0
      },
      onScanSuccess,
      () => {}
    );
  }catch(e){
    console.error('Error al iniciar cámara:', e);

    if(e.name === 'NotAllowedError' || (e.message && e.message.includes('Permission'))){
      toast('⚠️ Permití la cámara en los ajustes del sistema');
    } else {
      toast('⚠️ No se pudo abrir la cámara');
    }
    closeScanner();
  }
}

/* Callback cuando detecta un código */
function onScanSuccess(decodedText){
  if(navigator.vibrate) navigator.vibrate(30);

  const cb = scannerCallback;
  closeScanner();

  if(cb) cb(decodedText);
}

/* Cerrar el escáner */
async function closeScanner(){
  if(scannerInstance){
    try{
      await scannerInstance.stop();
      scannerInstance.clear();
    }catch(e){ /* ignorar */ }
    scannerInstance = null;
  }

  scannerCallback = null;
  closeModal('#m-scan');
}

/* Init (bind del botón X) */
function initScanner(){
  const closeBtn = $('#scan-close');
  if(closeBtn){
    closeBtn.addEventListener('click', closeScanner);
  }

  const modal = $('#m-scan');
  if(modal){
    modal.addEventListener('click', e => {
      if(e.target === modal) closeScanner();
    });
  }
}

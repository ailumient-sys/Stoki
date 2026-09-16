
/* =========================================================
   core/scanner.js — escáner de códigos de barras
   Usa html5-qrcode (funciona en Chrome Y APK).
   ========================================================= */

let scannerInstance = null;
let scannerCallback = null;

/* Abrir el modal de escaneo con un callback */
function openScanner(callback){
  scannerCallback = callback || null;
  openModal('#m-scan');
  /* Pequeño delay para que el modal esté visible */
  setTimeout(() => startScanner(), 250);
}

/* Iniciar la cámara */
async function startScanner(){
  const cont = $('#scanner-reader');
  if(!cont) return;

  /* Verificar librería */
  if(typeof Html5Qrcode === 'undefined'){
    toast('⚠️ Escáner no disponible');
    closeScanner();
    return;
  }

  /* Si ya había una instancia, limpiarla */
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
      () => {} /* ignorar errores de frame */
    );
  }catch(e){
    console.error('Error al iniciar cámara:', e);
    toast('⚠️ No se pudo abrir la cámara');
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

  /* También cerrar al tocar fuera */
  const modal = $('#m-scan');
  if(modal){
    modal.addEventListener('click', e => {
      if(e.target === modal) closeScanner();
    });
  }
}

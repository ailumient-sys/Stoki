/* =========================================================
   core/exporter.js — Guardar y compartir archivos
   v15: crea la carpeta padre antes de escribir
   ========================================================= */

const DIR_DOCUMENTS = 0;   /* Directory.Documents */

function tieneCapacitor(){
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function dataURLtoBase64(dataURL){
  const partes = dataURL.split(',');
  return partes.length > 1 ? partes[1] : partes[0];
}

function infoDebugArchivos(){
  const tieneCap = tieneCapacitor();
  const plugins = (window.Capacitor && window.Capacitor.Plugins)
    ? Object.keys(window.Capacitor.Plugins).join(', ')
    : 'ninguno';
  const tieneFs = !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem);

  return `tieneCapacitor: ${tieneCap}
Plugins disponibles: ${plugins}
Filesystem: ${tieneFs}`;
}

/* =========================================================
   ASEGURAR CARPETA
   Intenta crear la carpeta completa. Si ya existe, ignora el error.
   ========================================================= */
async function asegurarCarpeta(Filesystem, ruta, directory){
  if(!ruta) return;

  try{
    await Filesystem.mkdir({
      path: ruta,
      directory: directory,
      recursive: true
    });
  }catch(err){
    /* "Directory exists" o "File exists" son normales. Ignorar. */
    const msg = (err && err.message) ? err.message.toLowerCase() : '';
    if(!msg.includes('exist')){
      console.warn('mkdir warning:', err);
    }
  }
}

/* =========================================================
   GUARDAR ARCHIVO
   ========================================================= */
async function guardarArchivo(dataURL, nombreArchivo, subcarpeta){
  try{
    const ruta      = subcarpeta ? `Stoki/${subcarpeta}/${nombreArchivo}` : `Stoki/${nombreArchivo}`;
    const rutaDir   = subcarpeta ? `Stoki/${subcarpeta}` : 'Stoki';

    /* --- APK con Capacitor --- */
    if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem){
      try{
        const Filesystem = window.Capacitor.Plugins.Filesystem;
        const base64 = dataURLtoBase64(dataURL);

        /* 1. Crear la carpeta padre primero */
        await asegurarCarpeta(Filesystem, rutaDir, DIR_DOCUMENTS);

        /* 2. Escribir el archivo */
        const resultado = await Filesystem.writeFile({
          path: ruta,
          data: base64,
          directory: DIR_DOCUMENTS,
          recursive: true
        });

        return { ok: true, uri: resultado.uri, ruta };

      }catch(err){
        const msgErr = err && err.message ? err.message : JSON.stringify(err);
        alert('❌ ERROR en Filesystem:\n\n' + infoDebugArchivos() + '\n\nError: ' + msgErr);
        return { ok: false, error: msgErr };
      }
    }

    /* --- No es Capacitor: fallback navegador --- */
    if(!tieneCapacitor()){
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      return { ok: true, ruta: nombreArchivo };
    }

    alert('❌ Es APK pero NO tiene Filesystem\n\n' + infoDebugArchivos());
    return { ok: false, error: 'Filesystem no disponible' };

  }catch(e){
    const msgErr = e && e.message ? e.message : JSON.stringify(e);
    alert('❌ ERROR general:\n\n' + infoDebugArchivos() + '\n\nError: ' + msgErr);
    return { ok: false, error: msgErr };
  }
}

/* =========================================================
   COMPARTIR ARCHIVO
   ========================================================= */
async function compartirArchivo(dataURL, nombreArchivo, subcarpeta, titulo){
  try{
    const ruta    = subcarpeta ? `Stoki/${subcarpeta}/${nombreArchivo}` : `Stoki/${nombreArchivo}`;
    const rutaDir = subcarpeta ? `Stoki/${subcarpeta}` : 'Stoki';

    /* --- APK con Capacitor --- */
    if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem && window.Capacitor.Plugins.Share){
      try{
        const Filesystem = window.Capacitor.Plugins.Filesystem;
        const Share = window.Capacitor.Plugins.Share;
        const base64 = dataURLtoBase64(dataURL);

        /* 1. Crear carpeta padre */
        await asegurarCarpeta(Filesystem, rutaDir, DIR_DOCUMENTS);

        /* 2. Escribir archivo */
        const resultado = await Filesystem.writeFile({
          path: ruta,
          data: base64,
          directory: DIR_DOCUMENTS,
          recursive: true
        });

        /* 3. Compartir */
        await Share.share({
          title: titulo || nombreArchivo,
          url: resultado.uri
        });

        return { ok: true, ruta, compartido: true };

      }catch(err){
        if(err && (err.name === 'AbortError' || (err.message && err.message.includes('cancel')))){
          return { ok: false, cancelado: true };
        }
        const msgErr = err && err.message ? err.message : JSON.stringify(err);
        alert('❌ ERROR al compartir:\n\n' + infoDebugArchivos() + '\n\nError: ' + msgErr);
        return { ok: false, error: msgErr };
      }
    }

    /* --- Navegador: Web Share API --- */
    if(navigator.canShare && navigator.canShare({ files: [new File([], nombreArchivo)] })){
      const res = await fetch(dataURL);
      const blob = await res.blob();
      const file = new File([blob], nombreArchivo, { type: blob.type });

      await navigator.share({
        files: [file],
        title: titulo || nombreArchivo
      });

      return { ok: true, compartido: true };
    }

    /* --- Fallback: descarga --- */
    return await guardarArchivo(dataURL, nombreArchivo, subcarpeta);

  }catch(e){
    if(e.name === 'AbortError' || (e.message && e.message.includes('cancel'))){
      return { ok: false, cancelado: true };
    }
    console.error('Error al compartir:', e);
    return { ok: false, error: e.message || 'Error desconocido' };
  }
}

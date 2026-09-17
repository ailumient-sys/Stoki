/* =========================================================
   core/exporter.js — Guardar y compartir archivos
   v18: escribe en Cache (siempre existe) y comparte con Share
        Documents no existe en todos los celulares
   ========================================================= */

const DIR_DOCUMENTS = 0;
const DIR_CACHE     = 3;
const DIR_DATA      = 1;

function tieneCapacitor(){
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function dataURLtoBase64(dataURL){
  const partes = dataURL.split(',');
  return partes.length > 1 ? partes[1] : partes[0];
}

function infoDebugArchivos(){
  const plugins = (window.Capacitor && window.Capacitor.Plugins)
    ? Object.keys(window.Capacitor.Plugins).join(', ')
    : 'ninguno';
  return `tieneCapacitor: ${tieneCapacitor()}
Plugins: ${plugins}`;
}

function nombreConPrefijo(nombreArchivo, subcarpeta){
  const prefijo = subcarpeta ? `Stoki-${subcarpeta}-` : 'Stoki-';
  return prefijo + nombreArchivo;
}

/* =========================================================
   GUARDAR ARCHIVO
   1. Intenta en Documents
   2. Si falla, guarda en Cache y avisa al usuario
   ========================================================= */
async function guardarArchivo(dataURL, nombreArchivo, subcarpeta){
  try{
    const nombreFinal = nombreConPrefijo(nombreArchivo, subcarpeta);

    /* --- APK con Capacitor --- */
    if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem){
      const Filesystem = window.Capacitor.Plugins.Filesystem;
      const base64 = dataURLtoBase64(dataURL);

      /* Intento 1: Documents */
      try{
        const resultado = await Filesystem.writeFile({
          path: nombreFinal,
          data: base64,
          directory: DIR_DOCUMENTS,
          recursive: true
        });
        return { ok: true, uri: resultado.uri, ruta: nombreFinal, ubicacion: 'Documents' };
      }catch(errDoc){
        console.warn('Falló Documents, usando Cache:', errDoc);

        /* Intento 2: Cache (siempre existe) */
        try{
          const resultado = await Filesystem.writeFile({
            path: nombreFinal,
            data: base64,
            directory: DIR_CACHE,
            recursive: true
          });

          /* Compartir para que el usuario lo guarde donde quiera */
          if(window.Capacitor.Plugins.Share){
            const Share = window.Capacitor.Plugins.Share;
            await Share.share({
              title: nombreFinal,
              url: resultado.uri
            });
          }

          return { ok: true, uri: resultado.uri, ruta: nombreFinal, ubicacion: 'Cache', compartido: true };
        }catch(errCache){
          const msgErr = errCache && errCache.message ? errCache.message : JSON.stringify(errCache);
          alert('❌ ERROR al guardar:\n\n' + infoDebugArchivos() + '\n\nArchivo: ' + nombreFinal + '\nError Cache: ' + msgErr);
          return { ok: false, error: msgErr };
        }
      }
    }

    /* --- Fallback navegador --- */
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = nombreFinal;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return { ok: true, ruta: nombreFinal, ubicacion: 'navegador' };

  }catch(e){
    const msgErr = e && e.message ? e.message : JSON.stringify(e);
    alert('❌ ERROR general:\n\n' + infoDebugArchivos() + '\n\nError: ' + msgErr);
    return { ok: false, error: msgErr };
  }
}

/* =========================================================
   COMPARTIR ARCHIVO — siempre usa Cache + Share
   ========================================================= */
async function compartirArchivo(dataURL, nombreArchivo, subcarpeta, titulo){
  try{
    const nombreFinal = nombreConPrefijo(nombreArchivo, subcarpeta);

    if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem && window.Capacitor.Plugins.Share){
      try{
        const Filesystem = window.Capacitor.Plugins.Filesystem;
        const Share = window.Capacitor.Plugins.Share;
        const base64 = dataURLtoBase64(dataURL);

        /* Escribir en Cache (siempre existe) */
        const resultado = await Filesystem.writeFile({
          path: nombreFinal,
          data: base64,
          directory: DIR_CACHE,
          recursive: true
        });

        /* Compartir */
        await Share.share({
          title: titulo || nombreFinal,
          url: resultado.uri
        });

        return { ok: true, compartido: true, ubicacion: 'Cache' };

      }catch(err){
        if(err && (err.name === 'AbortError' || (err.message && err.message.includes('cancel')))){
          return { ok: false, cancelado: true };
        }
        const msgErr = err && err.message ? err.message : JSON.stringify(err);
        alert('❌ ERROR al compartir:\n\n' + infoDebugArchivos() + '\n\nError: ' + msgErr);
        return { ok: false, error: msgErr };
      }
    }

    /* Navegador: Web Share */
    if(navigator.canShare && navigator.canShare({ files: [new File([], nombreFinal)] })){
      const res = await fetch(dataURL);
      const blob = await res.blob();
      const file = new File([blob], nombreFinal, { type: blob.type });

      await navigator.share({
        files: [file],
        title: titulo || nombreFinal
      });

      return { ok: true, compartido: true };
    }

    return await guardarArchivo(dataURL, nombreArchivo, subcarpeta);

  }catch(e){
    if(e.name === 'AbortError' || (e.message && e.message.includes('cancel'))){
      return { ok: false, cancelado: true };
    }
    return { ok: false, error: e.message || 'Error desconocido' };
  }
}

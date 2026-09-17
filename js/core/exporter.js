/* =========================================================
   core/exporter.js — Guardar y compartir archivos
   v24: intenta Documents, fallback a Cache + Share
   ========================================================= */

const DIR_DOC_EXPORT   = 0;
const DIR_CACHE_EXPORT = 3;

function tieneCapacitor(){
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function dataURLtoBase64(dataURL){
  const partes = dataURL.split(',');
  return partes.length > 1 ? partes[1] : partes[0];
}

function construirNombre(nombreArchivo, tipo){
  if(!tipo) return `Stoki-${nombreArchivo}`;
  if(nombreArchivo.toLowerCase().startsWith(tipo.toLowerCase())){
    return `Stoki-${nombreArchivo}`;
  }
  return `Stoki-${tipo}-${nombreArchivo}`;
}

/* =========================================================
   GUARDAR — intenta Documents, fallback a Cache + Share
   ========================================================= */
async function guardarArchivo(dataURL, nombreArchivo, tipo){
  const nombreFinal = construirNombre(nombreArchivo, tipo);
  const base64 = dataURLtoBase64(dataURL);

  /* --- APK con Capacitor --- */
  if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem){
    const Filesystem = window.Capacitor.Plugins.Filesystem;

    /* INTENTO 1: Documents */
    try{
      const r = await Filesystem.writeFile({
        path: nombreFinal,
        data: base64,
        directory: DIR_DOC_EXPORT,
        recursive: true
      });

      toast(`📁 Guardado en Documents/${nombreFinal}`);
      return { ok: true, uri: r.uri, ruta: nombreFinal, ubicacion: 'Documents' };
    }catch(e1){
      console.warn('[Docs falló]', e1.message, '→ cayendo a Cache+Share');
    }

    /* INTENTO 2: Cache + Share */
    try{
      const r = await Filesystem.writeFile({
        path: nombreFinal,
        data: base64,
        directory: DIR_CACHE_EXPORT,
        recursive: true
      });

      /* Abrir Share para que el usuario guarde donde quiera */
      if(window.Capacitor.Plugins.Share){
        try{
          await window.Capacitor.Plugins.Share.share({
            title: nombreFinal,
            url: r.uri
          });
        }catch(eShare){
          if(eShare && eShare.message && eShare.message.includes('cancel')){
            return { ok: true, cancelado: true };
          }
        }
      }

      return { ok: true, uri: r.uri, ruta: nombreFinal, ubicacion: 'Cache', compartido: true };
    }catch(e2){
      const msg = e2 && e2.message ? e2.message : 'Error desconocido';
      alert('⚠️ No se pudo guardar el archivo.\n\nError: ' + msg);
      return { ok: false, error: msg };
    }
  }

  /* --- Fallback navegador (Chrome) --- */
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = nombreFinal;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  toast('📁 Descargado');
  return { ok: true, ruta: nombreFinal, ubicacion: 'navegador' };
}

/* =========================================================
   COMPARTIR — Cache + Share siempre
   ========================================================= */
async function compartirArchivo(dataURL, nombreArchivo, tipo, titulo){
  const nombreFinal = construirNombre(nombreArchivo, tipo);

  if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem && window.Capacitor.Plugins.Share){
    try{
      const Filesystem = window.Capacitor.Plugins.Filesystem;
      const Share = window.Capacitor.Plugins.Share;
      const base64 = dataURLtoBase64(dataURL);

      const r = await Filesystem.writeFile({
        path: nombreFinal,
        data: base64,
        directory: DIR_CACHE_EXPORT,
        recursive: true
      });

      await Share.share({
        title: titulo || nombreFinal,
        url: r.uri
      });

      return { ok: true, compartido: true };
    }catch(err){
      if(err && (err.name === 'AbortError' || (err.message && err.message.includes('cancel')))){
        return { ok: false, cancelado: true };
      }
      const msg = err && err.message ? err.message : 'Error desconocido';
      alert('⚠️ No se pudo compartir.\n\nError: ' + msg);
      return { ok: false, error: msg };
    }
  }

  /* Navegador: Web Share API */
  if(navigator.canShare && navigator.canShare({ files: [new File([], nombreFinal)] })){
    try{
      const res = await fetch(dataURL);
      const blob = await res.blob();
      const file = new File([blob], nombreFinal, { type: blob.type });

      await navigator.share({
        files: [file],
        title: titulo || nombreFinal
      });

      return { ok: true, compartido: true };
    }catch(e){
      if(e.name === 'AbortError') return { ok: false, cancelado: true };
    }
  }

  return await guardarArchivo(dataURL, nombreArchivo, tipo);
}

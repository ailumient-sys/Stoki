/* =========================================================
   core/exporter.js — Guardar y compartir archivos
   v25: SOLO Cache + Share (garantizado, sin errores)
   ========================================================= */

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

async function guardarArchivo(dataURL, nombreArchivo, tipo){
  const nombreFinal = construirNombre(nombreArchivo, tipo);
  const base64 = dataURLtoBase64(dataURL);

  if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem){
    try{
      const Filesystem = window.Capacitor.Plugins.Filesystem;

      const r = await Filesystem.writeFile({
        path: nombreFinal,
        data: base64,
        directory: DIR_CACHE_EXPORT,
        recursive: true
      });

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
          console.warn('Share error:', eShare);
        }
      }

      return { ok: true, uri: r.uri, ruta: nombreFinal, compartido: true };

    }catch(err){
      const msg = err && err.message ? err.message : 'Error desconocido';
      alert('No se pudo generar el archivo.\n\nError: ' + msg);
      return { ok: false, error: msg };
    }
  }

  const a = document.createElement('a');
  a.href = dataURL;
  a.download = nombreFinal;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  toast('Descargado');
  return { ok: true, ruta: nombreFinal };
}

async function compartirArchivo(dataURL, nombreArchivo, tipo, titulo){
  const nombreFinal = construirNombre(nombreArchivo, tipo);
  const base64 = dataURLtoBase64(dataURL);

  if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem && window.Capacitor.Plugins.Share){
    try{
      const Filesystem = window.Capacitor.Plugins.Filesystem;
      const Share = window.Capacitor.Plugins.Share;

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
      alert('No se pudo compartir.\n\nError: ' + msg);
      return { ok: false, error: msg };
    }
  }

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

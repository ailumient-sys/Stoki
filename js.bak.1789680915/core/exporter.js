/* =========================================================
   core/exporter.js — Guardar y compartir archivos
   v26: Directory como STRING (Capacitor Filesystem v6)
   ========================================================= */

const DIR_CACHE = 'CACHE';

function tieneCapacitor(){
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function dataURLtoBase64(dataURL){
  const partes = String(dataURL).split(',');
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

  if(tieneCapacitor()){
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    const Share      = window.Capacitor.Plugins.Share;

    if(!Filesystem){
      alert('Plugin Filesystem no disponible.\n\nReinstalá la app.');
      return { ok: false, error: 'NO_FILESYSTEM' };
    }

    try{
      console.log('[Exporter] writeFile →', nombreFinal, '| bytes:', base64.length);

      const r = await Filesystem.writeFile({
        path: nombreFinal,
        data: base64,
        directory: DIR_CACHE,
        recursive: true
      });

      console.log('[Exporter] OK →', r.uri);

      if(Share){
        try{
          await Share.share({
            title: nombreFinal,
            url: r.uri
          });
        }catch(eShare){
          const m = eShare && eShare.message ? eShare.message : '';
          if(m.toLowerCase().includes('cancel')){
            return { ok: true, cancelado: true };
          }
          console.warn('[Exporter] Share falló:', eShare);
        }
      }

      return { ok: true, uri: r.uri, ruta: nombreFinal, compartido: true };

    }catch(err){
      const msg = (err && err.message) ? err.message : String(err);
      console.error('[Exporter] ERROR:', err);
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

  if(tieneCapacitor()){
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    const Share      = window.Capacitor.Plugins.Share;

    if(Filesystem && Share){
      try{
        const r = await Filesystem.writeFile({
          path: nombreFinal,
          data: base64,
          directory: DIR_CACHE,
          recursive: true
        });

        await Share.share({
          title: titulo || nombreFinal,
          url: r.uri
        });

        return { ok: true, compartido: true };

      }catch(err){
        const msg = (err && err.message) ? err.message : String(err);
        if(msg.toLowerCase().includes('cancel')){
          return { ok: false, cancelado: true };
        }
        console.error('[Exporter] share error:', err);
        alert('No se pudo compartir.\n\nError: ' + msg);
        return { ok: false, error: msg };
      }
    }
  }

  if(navigator.canShare && navigator.canShare({ files: [new File([], nombreFinal)] })){
    try{
      const res  = await fetch(dataURL);
      const blob = await res.blob();
      const file = new File([blob], nombreFinal, { type: blob.type });

      await navigator.share({ files: [file], title: titulo || nombreFinal });
      return { ok: true, compartido: true };
    }catch(e){
      if(e.name === 'AbortError') return { ok: false, cancelado: true };
    }
  }

  return await guardarArchivo(dataURL, nombreArchivo, tipo);
}

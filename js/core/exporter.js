/* =========================================================
   core/exporter.js — Guardar y compartir archivos
   v16: mkdir paso a paso con debug
   ========================================================= */

const DIR_DOCUMENTS = 0;

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
  return `tieneCapacitor: ${tieneCap}
Plugins: ${plugins}`;
}

/* =========================================================
   ASEGURAR CARPETA — paso a paso con debug
   ========================================================= */
async function asegurarCarpeta(Filesystem, subcarpeta){
  const niveles = subcarpeta
    ? ['Stoki', `Stoki/${subcarpeta}`]
    : ['Stoki'];

  const resultados = [];

  for(const nivel of niveles){
    try{
      await Filesystem.mkdir({
        path: nivel,
        directory: DIR_DOCUMENTS,
        recursive: false
      });
      resultados.push(`✅ mkdir ${nivel}`);
    }catch(err){
      const msg = (err && err.message) ? err.message : String(err);
      resultados.push(`⚠️ mkdir ${nivel}: ${msg}`);
    }
  }

  return resultados.join('\n');
}

/* =========================================================
   GUARDAR ARCHIVO
   ========================================================= */
async function guardarArchivo(dataURL, nombreArchivo, subcarpeta){
  try{
    const ruta      = subcarpeta ? `Stoki/${subcarpeta}/${nombreArchivo}` : `Stoki/${nombreArchivo}`;

    /* --- APK con Capacitor --- */
    if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem){
      try{
        const Filesystem = window.Capacitor.Plugins.Filesystem;
        const base64 = dataURLtoBase64(dataURL);

        /* 1. Crear carpetas */
        const logMkdir = await asegurarCarpeta(Filesystem, subcarpeta);

        /* 2. Escribir archivo */
        const resultado = await Filesystem.writeFile({
          path: ruta,
          data: base64,
          directory: DIR_DOCUMENTS,
          recursive: true
        });

        alert('✅ GUARDADO OK\n\n' +
              infoDebugArchivos() +
              '\n\n' + logMkdir +
              '\n\nRuta: ' + ruta +
              '\nURI: ' + resultado.uri);

        return { ok: true, uri: resultado.uri, ruta };

      }catch(err){
        const msgErr = err && err.message ? err.message : JSON.stringify(err);
        alert('❌ ERROR:\n\n' + infoDebugArchivos() + '\n\nError: ' + msgErr);
        return { ok: false, error: msgErr };
      }
    }

    /* --- Fallback navegador --- */
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return { ok: true, ruta: nombreArchivo };

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
    const ruta = subcarpeta ? `Stoki/${subcarpeta}/${nombreArchivo}` : `Stoki/${nombreArchivo}`;

    if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem && window.Capacitor.Plugins.Share){
      try{
        const Filesystem = window.Capacitor.Plugins.Filesystem;
        const Share = window.Capacitor.Plugins.Share;
        const base64 = dataURLtoBase64(dataURL);

        const logMkdir = await asegurarCarpeta(Filesystem, subcarpeta);

        const resultado = await Filesystem.writeFile({
          path: ruta,
          data: base64,
          directory: DIR_DOCUMENTS,
          recursive: true
        });

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

    /* Navegador: Web Share */
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

    return await guardarArchivo(dataURL, nombreArchivo, subcarpeta);

  }catch(e){
    if(e.name === 'AbortError' || (e.message && e.message.includes('cancel'))){
      return { ok: false, cancelado: true };
    }
    return { ok: false, error: e.message || 'Error desconocido' };
  }
}

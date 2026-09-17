/* =========================================================
   core/exporter.js — Guardar y compartir archivos
   Funciona en Chrome (descarga normal) y APK (Filesystem + Share)
   ========================================================= */

/* Detecta si estamos en APK con Capacitor */
function tieneCapacitor(){
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

/* Convierte dataURL → base64 puro */
function dataURLtoBase64(dataURL){
  const partes = dataURL.split(',');
  return partes.length > 1 ? partes[1] : partes[0];
}

/* =========================================================
   GUARDAR ARCHIVO
   En APK → Documents/Stoki/{subcarpeta}/{nombre}
   En navegador → descarga normal
   Devuelve { ok: true, uri } o { ok: false, error }
   ========================================================= */
async function guardarArchivo(dataURL, nombreArchivo, subcarpeta){
  try{
    const ruta = subcarpeta ? `Stoki/${subcarpeta}/${nombreArchivo}` : `Stoki/${nombreArchivo}`;

    /* --- APK con Capacitor --- */
    if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem){
      const { Filesystem, Directory } = window.Capacitor.Plugins;
      const base64 = dataURLtoBase64(dataURL);

      const resultado = await Filesystem.writeFile({
        path: ruta,
        data: base64,
        directory: Directory.Documents,
        recursive: true
      });

      return { ok: true, uri: resultado.uri, ruta };
    }

    /* --- Navegador: descarga normal --- */
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return { ok: true, ruta: nombreArchivo };
  }catch(e){
    console.error('Error al guardar archivo:', e);
    return { ok: false, error: e.message || 'Error desconocido' };
  }
}

/* =========================================================
   COMPARTIR ARCHIVO
   En APK → comparte con WhatsApp, Gmail, etc.
   En navegador → Web Share API o descarga fallback
   ========================================================= */
async function compartirArchivo(dataURL, nombreArchivo, subcarpeta, titulo){
  try{
    /* --- APK con Capacitor --- */
    if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem && window.Capacitor.Plugins.Share){
      const { Filesystem, Directory, Share } = window.Capacitor.Plugins;
      const ruta = subcarpeta ? `Stoki/${subcarpeta}/${nombreArchivo}` : `Stoki/${nombreArchivo}`;
      const base64 = dataURLtoBase64(dataURL);

      /* Escribir el archivo primero */
      const resultado = await Filesystem.writeFile({
        path: ruta,
        data: base64,
        directory: Directory.Documents,
        recursive: true
      });

      /* Compartir */
      await Share.share({
        title: titulo || nombreArchivo,
        url: resultado.uri
      });

      return { ok: true, ruta, compartido: true };
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

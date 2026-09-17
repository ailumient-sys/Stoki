/* =========================================================
   core/exporter.js — Guardar y compartir archivos
   v20: usa Documents + MANAGE_EXTERNAL_STORAGE
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
  const plugins = (window.Capacitor && window.Capacitor.Plugins)
    ? Object.keys(window.Capacitor.Plugins).join(', ')
    : 'ninguno';
  return `tieneCapacitor: ${tieneCapacitor()}
Plugins: ${plugins}`;
}

function nombreConPrefijo(nombreArchivo, subcarpeta){
  return subcarpeta ? `Stoki/${subcarpeta}/${nombreArchivo}` : `Stoki/${nombreArchivo}`;
}

/* =========================================================
   ASEGURAR CARPETA — paso a paso
   ========================================================= */
async function asegurarCarpeta(Filesystem, subcarpeta){
  const niveles = subcarpeta
    ? ['Stoki', `Stoki/${subcarpeta}`]
    : ['Stoki'];

  for(const nivel of niveles){
    try{
      await Filesystem.mkdir({
        path: nivel,
        directory: DIR_DOCUMENTS,
        recursive: false
      });
    }catch(err){
      /* "Directory exists" es normal, ignorar */
      const msg = (err && err.message) ? err.message.toLowerCase() : '';
      if(!msg.includes('exist')){
        console.warn('mkdir warning:', nivel, err);
      }
    }
  }
}

/* =========================================================
   ABRIR AJUSTES DE "TODOS LOS ARCHIVOS"
   ========================================================= */
function abrirAjustesTodosLosArchivos(){
  try{
    /* Intent de Android para abrir la pantalla específica de la app */
    const intentUrl = 'intent:#Intent;action=android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION;' +
                      'package=com.stoki.app;end';

    /* Intentar con capacitor-native-settings si está */
    if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativeSettings){
      window.Capacitor.Plugins.NativeSettings.openAndroid({
        option: 'app'
      });
      return true;
    }

    /* Fallback: intent directo */
    window.location.href = intentUrl;
    return true;

  }catch(e){
    console.warn('No se pudo abrir ajustes:', e);
    return false;
  }
}

/* =========================================================
   GUARDAR ARCHIVO
   ========================================================= */
async function guardarArchivo(dataURL, nombreArchivo, subcarpeta){
  try{
    const ruta = nombreConPrefijo(nombreArchivo, subcarpeta);
    const rutaDir = subcarpeta ? `Stoki/${subcarpeta}` : 'Stoki';

    /* --- APK con Capacitor --- */
    if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem){
      try{
        const Filesystem = window.Capacitor.Plugins.Filesystem;
        const base64 = dataURLtoBase64(dataURL);

        /* 1. Asegurar carpeta */
        await asegurarCarpeta(Filesystem, subcarpeta);

        /* 2. Escribir archivo */
        const resultado = await Filesystem.writeFile({
          path: ruta,
          data: base64,
          directory: DIR_DOCUMENTS,
          recursive: true
        });

        return { ok: true, uri: resultado.uri, ruta };

      }catch(err){
        const msgErr = err && err.message ? err.message : JSON.stringify(err);
        console.error('Error Filesystem:', err);

        /* Si es por permisos, ofrecer abrir ajustes */
        if(msgErr.toLowerCase().includes('permission') ||
           msgErr.toLowerCase().includes('denied') ||
           msgErr.toLowerCase().includes('parent')){

          const quiere = confirm(
            '⚠️ Stoki necesita permiso para guardar archivos.\n\n' +
            '¿Querés abrir los ajustes para activarlo?\n\n' +
            '1. Buscá "Stoki" en la lista\n' +
            '2. Activá "Permitir administrar todos los archivos"'
          );

          if(quiere){
            abrirAjustesTodosLosArchivos();
          }

          return { ok: false, error: msgErr, necesitaPermiso: true };
        }

        alert('❌ ERROR al guardar:\n\n' + infoDebugArchivos() + '\n\nError: ' + msgErr);
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
    const ruta = nombreConPrefijo(nombreArchivo, subcarpeta);

    if(tieneCapacitor() && window.Capacitor.Plugins.Filesystem && window.Capacitor.Plugins.Share){
      try{
        const Filesystem = window.Capacitor.Plugins.Filesystem;
        const Share = window.Capacitor.Plugins.Share;
        const base64 = dataURLtoBase64(dataURL);

        await asegurarCarpeta(Filesystem, subcarpeta);

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

        return { ok: true, compartido: true };

      }catch(err){
        if(err && (err.name === 'AbortError' || (err.message && err.message.includes('cancel')))){
          return { ok: false, cancelado: true };
        }

        const msgErr = err && err.message ? err.message : JSON.stringify(err);

        /* Ofrecer abrir ajustes si es por permisos */
        if(msgErr.toLowerCase().includes('permission') ||
           msgErr.toLowerCase().includes('denied') ||
           msgErr.toLowerCase().includes('parent')){

          const quiere = confirm(
            '⚠️ Stoki necesita permiso para guardar archivos.\n\n' +
            '¿Querés abrir los ajustes para activarlo?'
          );
          if(quiere) abrirAjustesTodosLosArchivos();

          return { ok: false, error: msgErr, necesitaPermiso: true };
        }

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

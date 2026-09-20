// js/core/ocr.js — Stoki v15
// Prepara la foto (suavizado + resize) y extrae texto con el plugin nativo.
// Plugin: @capacitor-community/image-to-text@6.0.1

window.Ocr = (() => {
  const MAX_ANCHO = 800;   // ancho máximo de la foto guardada
  const CALIDAD   = 0.82;  // calidad JPEG (0-1)

  // ───────── Plugin nativo (defensivo: prueba varios nombres) ─────────
  function getPlugin() {
    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins) return null;
    return Capacitor.Plugins.Ocr
        || Capacitor.Plugins.ImageToText
        || Capacitor.Plugins.ImageToTextPlugin
        || null;
  }

  // ───────── File → HTMLImageElement ─────────
  function cargarImagen(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload  = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
      img.src = url;
    });
  }

  // ───────── Canvas con suavizado (basado en tu código) ─────────
  function canvasSuavizado(img, anchoMax = MAX_ANCHO) {
    let w = img.naturalWidth  || img.width;
    let h = img.naturalHeight || img.height;

    if (w > anchoMax) {
      h = Math.round(h * (anchoMax / w));
      w = anchoMax;
    }

    const off = document.createElement('canvas');
    off.width  = w;
    off.height = h;

    const octx = off.getContext('2d');
    octx.imageSmoothingEnabled = true;      // antialiasing
    octx.imageSmoothingQuality = 'high';    // 'low' | 'medium' | 'high'
    octx.drawImage(img, 0, 0, w, h);

    return off;
  }

  // ───────── File → dataURL JPEG comprimido ─────────
  async function prepararFoto(file) {
    const img    = await cargarImagen(file);
    const canvas = canvasSuavizado(img);
    return canvas.toDataURL('image/jpeg', CALIDAD);
  }

  // ───────── "data:image/jpeg;base64,XXXX" → "XXXX" ─────────
  function soloBase64(dataUrl) {
    return (dataUrl.split(',')[1] || '');
  }

  // ───────── Orquestador: File → { ok, texto, fotoDataUrl, error? } ─────────
  async function reconocerProducto(file) {
    const fotoDataUrl = await prepararFoto(file);
    const base64      = soloBase64(fotoDataUrl);

    const plugin = getPlugin();
    if (!plugin) {
      return { ok: false, error: 'plugin-no-disponible', texto: '', fotoDataUrl };
    }

    try {
      const r = await plugin.recognizeText({ base64 });
      const texto = (r && (r.text || (r.results && r.results.join(' ')))) || '';
      return { ok: true, texto: texto.trim(), fotoDataUrl };
    } catch (e) {
      return { ok: false, error: String(e), texto: '', fotoDataUrl };
    }
  }

  return {
    reconocerProducto,
    prepararFoto,
    cargarImagen,
    getPlugin,
    _canvasSuavizado: canvasSuavizado,   // expuesto para debug
    _soloBase64: soloBase64,
  };
})();

/* =========================================================
   core/ui.js — helpers de interfaz
   v11: getFotosProducto/getFotoPrincipal leen de IndexedDB
   ========================================================= */

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let toastTimer;
function toast(msg){
  const t = $('#toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
}

function openModal(id){
  const el = $(id);
  if(el) el.classList.add('open');
}

function closeModal(el){
  if(typeof el === 'string') el = $(el);
  if(el) el.classList.remove('open');
}

/* =========================================================
   CONFIRMACIÓN CUSTOM
   ========================================================= */
function confirmarAccion(opciones){
  return new Promise(resolve => {
    const prev = document.querySelector('#m-confirm');
    if(prev) prev.remove();

    const opt = opciones || {};
    const titulo = opt.titulo || '¿Estás seguro?';
    const mensaje = opt.mensaje || '';
    const botonOk = opt.botonOk || 'Confirmar';
    const botonCancel = opt.botonCancel || 'Cancelar';
    const colorOk = opt.colorOk || 'rojo';

    const claseBoton = colorOk === 'verde' ? 'btn-main'
                     : colorOk === 'neutral' ? 'btn-ghost'
                     : 'btn-ghost btn-danger';

    const html = `
      <div class="overlay centered open" id="m-confirm">
        <div class="sheet" style="position:relative;max-width:380px">
          <div class="confirm-custom-icon">⚠️</div>
          <h2 style="text-align:center;margin:0 0 10px">${esc(titulo)}</h2>
          ${mensaje ? `<div class="confirm-custom-msg">${esc(mensaje)}</div>` : ''}

          <button class="${claseBoton}" id="confirm-custom-ok"
                  style="margin-top:16px">
            ${esc(botonOk)}
          </button>
          <button class="btn-ghost" id="confirm-custom-cancel">
            ${esc(botonCancel)}
          </button>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    const modal = document.querySelector('#m-confirm');

    function cerrar(resultado){
      modal.remove();
      resolve(resultado);
    }

    document.querySelector('#confirm-custom-ok').addEventListener('click', () => cerrar(true));
    document.querySelector('#confirm-custom-cancel').addEventListener('click', () => cerrar(false));

    modal.addEventListener('click', e => {
      if(e.target.id === 'm-confirm') cerrar(false);
    });

    if(navigator.vibrate) navigator.vibrate(20);
  });
}

/* =========================================================
   IMÁGENES
   ========================================================= */
function resizeImage(file, max, quality = 0.72){
  return new Promise(resolve => {
    const reader = new FileReader();

    reader.onload = ev => {
      const img = new Image();

      img.onload = () => {
        const { width: w, height: h } = img;
        const scale = Math.min(1, max / Math.max(w, h));

        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(w * scale);
        canvas.height = Math.round(h * scale);

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      img.src = ev.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/* Devuelve el array de fotos del producto (base64) */
function getFotosProducto(p){
  if(!p) return [];

  /* 1. Caché en memoria (IndexedDB) */
  const cached = window.FOTOS && window.FOTOS[p.id];
  if(cached && cached.length) return cached;

  /* 2. Compatibilidad: si aún tiene fotos en localStorage */
  if(Array.isArray(p.fotos) && p.fotos.length) return p.fotos;

  return [];
}

/* Devuelve la foto principal (base64) o null */
function getFotoPrincipal(p){
  const fotos = getFotosProducto(p);
  if(!fotos.length) return null;
  const idx = typeof p.fotoPrincipal === 'number' ? p.fotoPrincipal : 0;
  return fotos[idx] || fotos[0] || null;
}

/* Miniatura cuadrada para listas (carrito, pedidos, ventas, proveedores) */
function buildThumb(p, size){
  const s = size || 48;
  const foto = getFotoPrincipal(p);

  if(foto){
    return `<div style="width:${s}px;height:${s}px;border-radius:10px;` +
           `background-image:url('${foto}');background-size:cover;` +
           `background-position:center;flex:0 0 auto"></div>`;
  }

  const inicial = esc((p && p.nombre ? p.nombre : '?').charAt(0).toUpperCase());
  const fs = Math.round(s * 0.4);

  return `<div style="width:${s}px;height:${s}px;border-radius:10px;` +
         `background:var(--bg3);display:flex;align-items:center;` +
         `justify-content:center;font-size:${fs}px;font-weight:900;` +
         `color:var(--dim);flex:0 0 auto">${inicial}</div>`;
}

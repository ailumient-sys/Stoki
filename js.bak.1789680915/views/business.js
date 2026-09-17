/* =========================================================
   views/business.js — Datos del negocio para la factura
   ========================================================= */

function openBusinessConfig(){
  const b = window.DB.settings.business || {};

  if(document.querySelector('#m-business')) return;

  const html = `
    <div class="overlay centered open" id="m-business">
      <div class="sheet" style="position:relative">
        <button class="x" id="biz-close">✕</button>
        <h2>🏪 Mi negocio</h2>
        <div class="sub">Estos datos aparecen en tus facturas.</div>

        <label>Nombre del negocio</label>
        <input id="biz-nombre" placeholder="Ej: Tienda María"
               value="${esc(b.nombre || '')}">

        <label>RIF / Documento</label>
        <input id="biz-rif" placeholder="Ej: J-12345678-9"
               value="${esc(b.rif || '')}">

        <label>Teléfono</label>
        <input id="biz-tel" type="tel" placeholder="Ej: 0412-1234567"
               value="${esc(b.telefono || '')}">

        <label>Dirección</label>
        <input id="biz-dir" placeholder="Ej: Av. Principal, Local 5"
               value="${esc(b.direccion || '')}">

        <button class="btn-main" id="biz-save">Guardar datos</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#biz-close').addEventListener('click', closeBusiness);
  document.querySelector('#biz-save').addEventListener('click', saveBusiness);

  document.querySelector('#m-business').addEventListener('click', e => {
    if(e.target.id === 'm-business') closeBusiness();
  });

  setTimeout(() => document.querySelector('#biz-nombre').focus(), 300);
}

function closeBusiness(){
  const el = document.querySelector('#m-business');
  if(el) el.remove();
}

function saveBusiness(){
  const b = {
    nombre:    document.querySelector('#biz-nombre').value.trim(),
    rif:       document.querySelector('#biz-rif').value.trim(),
    telefono:  document.querySelector('#biz-tel').value.trim(),
    direccion: document.querySelector('#biz-dir').value.trim()
  };

  window.DB.settings.business = b;
  saveDB();
  closeBusiness();
  toast('✅ Datos del negocio guardados');
}

function initBusiness(){
  const btn = document.querySelector('#btn-business');
  if(btn) btn.addEventListener('click', openBusinessConfig);
}


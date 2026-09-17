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

        <label>QR de Pago Móvil <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span></label>
        <div class="pm-qr-row">
          <div class="pm-qr-thumb" id="biz-qr-thumb">📱</div>
          <div class="pm-qr-info">
            <div class="pm-qr-nombre" id="biz-qr-nombre">Sin QR</div>
            <div class="pm-qr-sub">Se muestra al cobrar con Pago Móvil</div>
          </div>
          <button type="button" class="pm-qr-btn" id="biz-qr-pick">Elegir</button>
          <button type="button" class="pm-qr-btn danger" id="biz-qr-del" style="display:none">✕</button>
        </div>
        <input type="file" id="biz-qr-file" accept="image/*" style="display:none">

        <button class="btn-main" id="biz-save">Guardar datos</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#biz-close').addEventListener('click', closeBusiness);
  document.querySelector('#biz-save').addEventListener('click', saveBusiness);

  document.querySelector('#m-business').addEventListener('click', e => {
    if(e.target.id === 'm-business') closeBusiness();
  });

  /* QR Pago Móvil */
  window._bizQR = b.qrPagoMovil || null;
  actualizarQRBusiness();

  document.querySelector('#biz-qr-pick').addEventListener('click', () => {
    document.querySelector('#biz-qr-file').click();
  });

  document.querySelector('#biz-qr-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if(!f) return;
    try{
      const base64 = await resizeImage(f, 500, 0.8);
      window._bizQR = base64;
      actualizarQRBusiness();
      toast('✅ QR cargado — tocá Guardar');
    }catch(err){
      console.error(err);
      toast('⚠️ No se pudo cargar la imagen');
    }
    e.target.value = '';
  });

  document.querySelector('#biz-qr-del').addEventListener('click', () => {
    window._bizQR = null;
    actualizarQRBusiness();
  });

  setTimeout(() => document.querySelector('#biz-nombre').focus(), 300);
}

function actualizarQRBusiness(){
  const thumb = document.querySelector('#biz-qr-thumb');
  const nombre = document.querySelector('#biz-qr-nombre');
  const del = document.querySelector('#biz-qr-del');
  if(!thumb) return;

  const qr = window._bizQR;
  if(qr){
    thumb.style.backgroundImage = `url('${qr}')`;
    thumb.textContent = '';
    if(nombre) nombre.textContent = 'QR cargado';
    if(del) del.style.display = 'block';
  } else {
    thumb.style.backgroundImage = '';
    thumb.textContent = '📱';
    if(nombre) nombre.textContent = 'Sin QR';
    if(del) del.style.display = 'none';
  }
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
    direccion: document.querySelector('#biz-dir').value.trim(),
    qrPagoMovil: window._bizQR || null
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


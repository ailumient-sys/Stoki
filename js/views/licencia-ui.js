/* =========================================================
   views/licencia-ui.js — Pantalla de activación + bloqueo
   ========================================================= */

function mostrarPantallaActivacion(){
  if(document.querySelector('#lic-activar')) return;

  const L = window.STOKI_LIC;
  const deviceId = L.deviceId || '...';

  const html = `
    <div class="lic-overlay" id="lic-activar">
      <div class="lic-card">
        <div class="lic-icon">🔑</div>
        <h2>Activar Stoki</h2>
        <div class="lic-sub">Ingresá tu código de licencia para empezar.</div>

        ${L.trial && L.diasRestantes > 0 ? `
          <div class="lic-trial">
            🎁 Modo prueba · ${L.diasRestantes} día${L.diasRestantes !== 1 ? 's' : ''} restante${L.diasRestantes !== 1 ? 's' : ''}
          </div>
        ` : ''}

        <label>Tu Device ID (mandalo por WhatsApp)</label>
        <div class="lic-device-row">
          <div class="lic-device-id" id="lic-device-id">${deviceId}</div>
          <button class="lic-device-copy" id="lic-device-copy" type="button">📋</button>
        </div>

        <label>Código de licencia</label>
        <textarea id="lic-codigo" placeholder="STOKI-..." autocomplete="off" rows="3"></textarea>
        <button class="btn-ghost" id="lic-pegar" type="button" style="margin-top:6px">📋 Pegar del portapapeles</button>

        <div class="lic-error" id="lic-error" style="display:none"></div>

        <button class="btn-main" id="lic-activar-btn" style="margin-top:14px">✅ Activar</button>

        ${L.trial && L.diasRestantes > 0 ? `
          <button class="btn-ghost" id="lic-seguir-trial" style="margin-top:8px">Continuar con el trial</button>
        ` : ''}
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const $cod = document.querySelector('#lic-codigo');
  const $err = document.querySelector('#lic-error');

  document.querySelector('#lic-device-copy').addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(deviceId);
      toast('📋 Device ID copiado');
    }catch(e){ toast('⚠️ Copialo manual'); }
  });

  document.querySelector('#lic-pegar').addEventListener('click', async () => {
    try{
      const txt = await navigator.clipboard.readText();
      if(txt) $cod.value = txt.trim();
    }catch(e){ toast('⚠️ No se pudo leer el portapapeles'); }
  });

  const seguirTrial = document.querySelector('#lic-seguir-trial');
  if(seguirTrial){
    seguirTrial.addEventListener('click', () => {
      document.querySelector('#lic-activar').remove();
    });
  }

  document.querySelector('#lic-activar-btn').addEventListener('click', async () => {
    const codigo = $cod.value.trim();
    if(!codigo) return toast('⚠️ Pegá el código');
    $err.style.display = 'none';

    const r = await activarLicencia(codigo);

    if(r.ok){
      document.querySelector('#lic-activar').remove();
      document.body.classList.remove('lic-bloqueada');
      toast('✅ Licencia activada · ' + r.diasRestantes + ' días');
      if(navigator.vibrate) navigator.vibrate(30);
    } else {
      const msgs = {
        'device-no-coincide': '⚠️ Este código no es para este teléfono',
        'firma-invalida': '⚠️ Código inválido',
        'expirada': '⚠️ Este código ya expiró',
        'formato': '⚠️ Formato incorrecto',
        'base64': '⚠️ Código corrupto',
        'estructura': '⚠️ Código incompleto'
      };
      $err.textContent = msgs[r.error] || '⚠️ Código inválido';
      $err.style.display = 'block';
      if(navigator.vibrate) navigator.vibrate([20, 50, 20]);
    }
  });
}

function mostrarPantallaBloqueo(){
  if(document.querySelector('#lic-bloqueo')) return;

  const L = window.STOKI_LIC;
  const deviceId = L.deviceId || '...';

  const razon = L.error === 'trial-expirado'
    ? 'El período de prueba terminó'
    : L.error === 'expirada'
    ? 'Tu licencia expiró'
    : 'Necesitás activar Stoki';

  const html = `
    <div class="lic-overlay" id="lic-bloqueo">
      <div class="lic-card">
        <div class="lic-icon">🔒</div>
        <h2>${razon}</h2>
        <div class="lic-sub">Activate con un código para seguir. Tus datos están seguros.</div>

        <label>Tu Device ID</label>
        <div class="lic-device-row">
          <div class="lic-device-id" id="lic-block-device">${deviceId}</div>
          <button class="lic-device-copy" id="lic-block-copy" type="button">📋</button>
        </div>

        <label>Código de licencia</label>
        <textarea id="lic-block-codigo" placeholder="STOKI-..." autocomplete="off" rows="3"></textarea>
        <button class="btn-ghost" id="lic-block-pegar" type="button" style="margin-top:6px">📋 Pegar</button>

        <div class="lic-error" id="lic-block-error" style="display:none"></div>

        <button class="btn-main" id="lic-block-activar" style="margin-top:14px">✅ Activar</button>

        <button class="btn-ghost" id="lic-block-export" style="margin-top:8px">
          📤 Exportar mi inventario
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const $cod = document.querySelector('#lic-block-codigo');
  const $err = document.querySelector('#lic-block-error');

  document.querySelector('#lic-block-copy').addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(deviceId);
      toast('📋 Copiado');
    }catch(e){ toast('⚠️ Copialo manual'); }
  });

  document.querySelector('#lic-block-pegar').addEventListener('click', async () => {
    try{
      const txt = await navigator.clipboard.readText();
      if(txt) $cod.value = txt.trim();
    }catch(e){ toast('⚠️ No se pudo leer'); }
  });

  document.querySelector('#lic-block-activar').addEventListener('click', async () => {
    const codigo = $cod.value.trim();
    if(!codigo) return toast('⚠️ Pegá el código');
    $err.style.display = 'none';

    const r = await activarLicencia(codigo);
    if(r.ok){
      document.querySelector('#lic-bloqueo').remove();
      document.body.classList.remove('lic-bloqueada');
      toast('✅ Licencia activada');
      if(navigator.vibrate) navigator.vibrate(30);
    } else {
      $err.textContent = r.error === 'device-no-coincide'
        ? '⚠️ Este código es para otro teléfono'
        : '⚠️ Código inválido o expirado';
      $err.style.display = 'block';
    }
  });

  document.querySelector('#lic-block-export').addEventListener('click', async () => {
    if(typeof exportBackup === 'function'){
      await exportBackup();
    }
  });
}

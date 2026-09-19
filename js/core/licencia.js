/* =========================================================
   core/licencia.js — Sistema de licencias offline
   HMAC-SHA256 + Device ID + Trial 7 días
   ========================================================= */

const LIC_CLAVE_B64 = "OWYyZTVhN2MxYjRkOGYzYTZjOWUyYjVkN2YxYTRjOGUzYjZkOWYyYTVjN2UxYjRkOGY2YTNjOWU1YjJkN2YxYQ==";

const LIC_STORAGE_KEY_1 = 'stoki_lic_1';
const LIC_STORAGE_KEY_2 = 'stoki_lic_2';
const LIC_TRIAL_DIAS    = 7;
const LIC_HW_KEY        = 'stoki_hw_clock';

let _deviceId = null;

async function obtenerDeviceId(){
  if(_deviceId) return _deviceId;

  try{
    const Cap = window.Capacitor;
    const Device = Cap && Cap.Plugins && Cap.Plugins.Device;

    if(Device && Device.getId){
      const info = await Device.getId();
      _deviceId = info.identifier || info.uuid || 'unknown';
    } else {
      let local = '';
      try{ local = localStorage.getItem('stoki_web_device') || ''; }catch(e){}
      if(!local){
        local = 'web-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        try{ localStorage.setItem('stoki_web_device', local); }catch(e){}
      }
      _deviceId = local;
    }
  }catch(e){
    console.warn('[Licencia] No se pudo obtener device ID:', e);
    _deviceId = 'error-unknown';
  }

  return _deviceId;
}

async function licHmac(clave, mensaje){
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(clave),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const firma = await crypto.subtle.sign('HMAC', key, enc.encode(mensaje));
  return Array.from(new Uint8Array(firma))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

function licBase64urlDecode(str){
  try{
    let b = str.replace(/-/g, '+').replace(/_/g, '/');
    while(b.length % 4) b += '=';
    const bin = atob(b);
    const bytes = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }catch(e){
    return null;
  }
}

async function validarLicencia(codigo){
  if(!codigo || typeof codigo !== 'string') return { ok: false, error: 'codigo-vacio' };
  if(!codigo.startsWith('STOKI-')) return { ok: false, error: 'formato' };

  const b64 = codigo.slice(6);
  const decoded = licBase64urlDecode(b64);
  if(!decoded) return { ok: false, error: 'base64' };

  const partes = decoded.split('|');
  if(partes.length !== 4) return { ok: false, error: 'estructura' };

  const [deviceId, expiraStr, tipo, firma] = partes;
  const expira = parseInt(expiraStr);

  const miDevice = await obtenerDeviceId();
  if(deviceId !== miDevice){
    return { ok: false, error: 'device-no-coincide' };
  }

  const clave = atob(LIC_CLAVE_B64);
  const payload = deviceId + '|' + expiraStr + '|' + tipo;
  const firmaEsperada = (await licHmac(clave, payload)).slice(0, 12);

  if(firma !== firmaEsperada){
    return { ok: false, error: 'firma-invalida' };
  }

  if(Date.now() > expira){
    return { ok: false, error: 'expirada', expira };
  }

  return {
    ok: true,
    deviceId,
    expira,
    tipo,
    diasRestantes: Math.ceil((expira - Date.now()) / 86400000)
  };
}

function licGuardarEstado(estado){
  try{
    const json = JSON.stringify(estado);
    localStorage.setItem(LIC_STORAGE_KEY_1, json);
    localStorage.setItem(LIC_STORAGE_KEY_2, btoa(json));
  }catch(e){}
}

function licLeerEstado(){
  try{
    const raw = localStorage.getItem(LIC_STORAGE_KEY_1);
    if(raw) return JSON.parse(raw);
  }catch(e){}

  try{
    const b64 = localStorage.getItem(LIC_STORAGE_KEY_2);
    if(b64){
      const decoded = JSON.parse(atob(b64));
      try{ localStorage.setItem(LIC_STORAGE_KEY_1, JSON.stringify(decoded)); }catch(e){}
      return decoded;
    }
  }catch(e){}

  return null;
}

function licVerificarReloj(){
  try{
    const raw = localStorage.getItem(LIC_HW_KEY);
    const ultima = raw ? parseInt(raw) : 0;
    const ahora = Date.now();
    if(ultima && ahora < ultima - 300000) return false;
    localStorage.setItem(LIC_HW_KEY, String(ahora));
    return true;
  }catch(e){
    return true;
  }
}

window.STOKI_LIC = {
  activa: false,
  trial: false,
  bloqueada: false,
  diasRestantes: 0,
  tipo: null,
  deviceId: null
};

async function verificarLicencia(){
  if(!window.Capacitor || !window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform()){
    window.STOKI_LIC = { activa: true, trial: false, bloqueada: false, diasRestantes: 999, tipo: 'dev', deviceId: 'dev-browser' };
    console.log('🔓 Modo dev: licencia saltada');
    return window.STOKI_LIC;
  }

  const deviceId = await obtenerDeviceId();
  window.STOKI_LIC.deviceId = deviceId;

  licVerificarReloj();

  const estado = licLeerEstado() || {};

  if(estado.codigo){
    const r = await validarLicencia(estado.codigo);
    if(r.ok){
      window.STOKI_LIC = {
        activa: true, trial: false, bloqueada: false,
        diasRestantes: r.diasRestantes, tipo: r.tipo,
        deviceId, expira: r.expira, codigo: estado.codigo
      };
      return window.STOKI_LIC;
    } else {
      window.STOKI_LIC = {
        activa: false, trial: false, bloqueada: true,
        diasRestantes: 0, tipo: null, deviceId, error: r.error
      };
      return window.STOKI_LIC;
    }
  }

  const ahora = Date.now();
  let trialInicio = estado.trialInicio;

  if(!trialInicio){
    trialInicio = ahora;
    licGuardarEstado({ ...estado, trialInicio });
  }

  const diasTranscurridos = (ahora - trialInicio) / 86400000;
  const diasRestantes = Math.max(0, Math.ceil(LIC_TRIAL_DIAS - diasTranscurridos));

  if(diasRestantes <= 0){
    window.STOKI_LIC = {
      activa: false, trial: false, bloqueada: true,
      diasRestantes: 0, tipo: null, deviceId, error: 'trial-expirado'
    };
    return window.STOKI_LIC;
  }

  window.STOKI_LIC = {
    activa: true, trial: true, bloqueada: false,
    diasRestantes, tipo: 'trial', deviceId, trialInicio
  };
  return window.STOKI_LIC;
}

async function activarLicencia(codigo){
  codigo = (codigo || '').trim();
  if(!codigo) return { ok: false, error: 'codigo-vacio' };

  const r = await validarLicencia(codigo);
  if(!r.ok) return r;

  const estado = licLeerEstado() || {};
  estado.codigo = codigo;
  licGuardarEstado(estado);

  window.STOKI_LIC = {
    activa: true, trial: false, bloqueada: false,
    diasRestantes: r.diasRestantes, tipo: r.tipo,
    deviceId: r.deviceId, expira: r.expira, codigo
  };

  return { ok: true, diasRestantes: r.diasRestantes, tipo: r.tipo };
}

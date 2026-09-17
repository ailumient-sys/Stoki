/* =========================================================
   core/format.js — formato de datos
   v4: agrega fmtDual() para mostrar moneda principal + referencia
   ========================================================= */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* =========================================================
   DINERO
   ========================================================= */
function fmt(n){
  n = Number(n) || 0;

  try{
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: window.DB.settings.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(n);
  }catch(e){
    return '$' + n.toFixed(0);
  }
}

function fmtShort(n){
  n = Number(n) || 0;
  const abs = Math.abs(n);

  if(abs >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if(abs >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'k';
  if(abs >= 100) return n.toFixed(0);

  return n.toFixed(2).replace(/\.?0+$/, '');
}

/* =========================================================
   MONEDA DE REFERENCIA
   ========================================================= */

/* Formatea un valor en la moneda de referencia (Bs por defecto) */
function fmtRef(n, tasaOverride){
  n = Number(n) || 0;

  const tasa = (typeof tasaOverride === 'number' && !isNaN(tasaOverride))
    ? tasaOverride
    : (Number(window.DB.settings.tasaDia) || 0);

  const refCur = window.DB.settings.refCurrency || 'VES';

  if(tasa <= 0) return null;   /* sin tasa: no mostrar */

  const valorRef = n * tasa;

  try{
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: refCur,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(valorRef);
  }catch(e){
    return 'Bs. ' + valorRef.toFixed(2);
  }
}

/* "USD $25 · Bs. 1.000,00"
   - Si no hay tasa, devuelve solo la principal
   - tasaOverride: usa esa tasa en lugar de la global (para snapshots) */
function fmtDual(n, tasaOverride){
  const principal = fmt(n);
  const ref = fmtRef(n, tasaOverride);
  return ref ? `${principal} · ${ref}` : principal;
}

/* Solo la referencia: "≈ Bs. 1.000,00" */
function fmtRefOnly(n, tasaOverride){
  const ref = fmtRef(n, tasaOverride);
  return ref ? `≈ ${ref}` : '';
}

/* =========================================================
   FECHAS
   ========================================================= */
function todayISO(){
  return new Date().toISOString().slice(0, 10);
}

function fmtDateTime(iso){
  if(!iso) return '';
  const [fecha, hora] = iso.split('T');
  if(!fecha) return iso;
  const [y, m, d] = fecha.split('-');
  const hhmm = hora ? hora.slice(0, 5) : '';
  return hhmm ? `${d}/${m} ${hhmm}` : `${d}/${m}/${y}`;
}

/* =========================================================
   TEXTO SEGURO
   ========================================================= */
function esc(s){
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

/* =========================================================
   AGRUPACIÓN POR PERÍODO
   ========================================================= */
function periodKey(iso, mode){
  const d = new Date(iso);

  if(mode === 'diario')  return iso.slice(0, 10);
  if(mode === 'mensual') return iso.slice(0, 7);
  if(mode === 'anual')   return String(d.getFullYear());

  if(mode === 'semanal'){
    const t = new Date(d);
    t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() - ((t.getDay() + 6) % 7));
    return t.toISOString().slice(0, 10);
  }
}

function labelOf(key, mode){
  const M = ['Ene','Feb','Mar','Abr','May','Jun',
             'Jul','Ago','Sep','Oct','Nov','Dic'];

  if(mode === 'diario'){
    const [y, m, d] = key.split('-');
    return `${d}/${m}`;
  }

  if(mode === 'mensual'){
    const [y, m] = key.split('-');
    return `${M[+m - 1]} ${y.slice(2)}`;
  }

  if(mode === 'semanal'){
    const [y, m, d] = key.split('-');
    return `Sem ${d}/${m}`;
  }

  return key;
}
/* =========================================================
   core/storage.js — persistencia
   v14: DB completo en IndexedDB + migración automática
   ========================================================= */

const STORAGE_KEY     = 'stocki_v1';
const SESSION_KEY     = 'stoki_sesion_compra';
const CARRITO_KEY     = 'stoki_carrito';
const STORAGE_VERSION = 14;

const FOTOS_DB      = 'stoki-fotos';
const FOTOS_STORE   = 'fotos';
const COMPROB_STORE = 'comprobantes';

const MAIN_DB    = 'stoki-db';
const MAIN_STORE = 'kv';

let _fotosDB = null;
let _mainDB  = null;
let _guardando = false;
let _pendienteGuardar = false;

window.DB = {
  version: STORAGE_VERSION,
  products: [],
  tickets: [],
  clients: [],
  suppliers: [],
  orders: [],
  categories: [],
  settings: {
    currency: 'USD',
    refCurrency: 'VES',
    tasaDia: 0,
    tasaActualizada: null,
    apariencia: {
      preset: 'verde',
      headerTipo: 'gradient',
      headerValor: 'linear-gradient(135deg, #22c55e, #16a34a)',
      fondoColor: null,
      imagenHeader: null,
      imagenFondo: null
    }
  },
  ventaCounter: {},
  historialCompras: [],
  shoppingLists: []
};

window.SESSION      = null;
window.CARRITO      = { items: [] };
window.FOTOS        = {};
window.COMPROBANTES = {};

/* =========================================================
   INDEXEDDB — DB PRINCIPAL (kv)
   ========================================================= */
function abrirMainDB(){
  return new Promise((resolve, reject) => {
    if(_mainDB) return resolve(_mainDB);

    const req = indexedDB.open(MAIN_DB, 1);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(MAIN_STORE)){
        db.createObjectStore(MAIN_STORE);
      }
    };

    req.onsuccess = e => {
      _mainDB = e.target.result;
      resolve(_mainDB);
    };

    req.onerror = e => reject(e.target.error);
  });
}

async function idbGet(key){
  const db = await abrirMainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MAIN_STORE, 'readonly');
    const req = tx.objectStore(MAIN_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function idbSet(key, value){
  const db = await abrirMainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MAIN_STORE, 'readwrite');
    tx.objectStore(MAIN_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

/* =========================================================
   INDEXEDDB — FOTOS + COMPROBANTES
   ========================================================= */
function abrirFotosDB(){
  return new Promise((resolve, reject) => {
    if(_fotosDB) return resolve(_fotosDB);

    const req = indexedDB.open(FOTOS_DB, 2);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(FOTOS_STORE)){
        db.createObjectStore(FOTOS_STORE);
      }
      if(!db.objectStoreNames.contains(COMPROB_STORE)){
        db.createObjectStore(COMPROB_STORE);
      }
    };

    req.onsuccess = e => {
      _fotosDB = e.target.result;
      resolve(_fotosDB);
    };

    req.onerror = e => reject(e.target.error);
  });
}

async function guardarFotosProducto(productoId, fotos){
  const db = await abrirFotosDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FOTOS_STORE, 'readwrite');
    const store = tx.objectStore(FOTOS_STORE);
    if(!fotos || !fotos.length){
      store.delete(productoId);
    } else {
      store.put(fotos, productoId);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

async function eliminarFotosProducto(productoId){
  const db = await abrirFotosDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FOTOS_STORE, 'readwrite');
    tx.objectStore(FOTOS_STORE).delete(productoId);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

async function cargarTodasLasFotos(){
  const db = await abrirFotosDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FOTOS_STORE, 'readonly');
    const store = tx.objectStore(FOTOS_STORE);
    const req = store.openCursor();
    const out = {};
    req.onsuccess = e => {
      const cursor = e.target.result;
      if(cursor){
        out[cursor.key] = cursor.value;
        cursor.continue();
      } else {
        resolve(out);
      }
    };
    req.onerror = e => reject(e.target.error);
  });
}

async function guardarComprobanteDB(pedidoId, comprobante){
  const db = await abrirFotosDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COMPROB_STORE, 'readwrite');
    const store = tx.objectStore(COMPROB_STORE);
    if(!comprobante || !comprobante.imagen){
      store.delete(pedidoId);
    } else {
      store.put(comprobante, pedidoId);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

async function eliminarComprobanteDB(pedidoId){
  const db = await abrirFotosDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COMPROB_STORE, 'readwrite');
    tx.objectStore(COMPROB_STORE).delete(pedidoId);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

async function cargarTodosLosComprobantes(){
  const db = await abrirFotosDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COMPROB_STORE, 'readonly');
    const store = tx.objectStore(COMPROB_STORE);
    const req = store.openCursor();
    const out = {};
    req.onsuccess = e => {
      const cursor = e.target.result;
      if(cursor){
        out[cursor.key] = cursor.value;
        cursor.continue();
      } else {
        resolve(out);
      }
    };
    req.onerror = e => reject(e.target.error);
  });
}

/* =========================================================
   PRECARGA + MIGRACIÓN
   ========================================================= */
async function precargarFotos(){
  try{
    const guardadas = await cargarTodasLasFotos();
    window.FOTOS = guardadas || {};
  }catch(e){
    console.warn('⚠️ IndexedDB fotos no disponible:', e);
    window.FOTOS = {};
  }

  try{
    const comps = await cargarTodosLosComprobantes();
    window.COMPROBANTES = comps || {};
  }catch(e){
    console.warn('⚠️ IndexedDB comprobantes no disponible:', e);
    window.COMPROBANTES = {};
  }

  /* Migrar fotos viejas (base64 en localStorage) */
  const migrar = [];
  (window.DB.products || []).forEach(p => {
    if(Array.isArray(p.fotos) && p.fotos.length &&
       typeof p.fotos[0] === 'string' &&
       p.fotos[0].startsWith('data:')){
      window.FOTOS[p.id] = p.fotos.slice();
      migrar.push(p);
    }
  });

  if(migrar.length){
    for(const p of migrar){
      try{
        await guardarFotosProducto(p.id, window.FOTOS[p.id]);
      }catch(e){
        console.warn('Migración foto falló para', p.id, e);
        continue;
      }
      p.cantidadFotos = window.FOTOS[p.id].length;
      delete p.fotos;
    }
    saveDB();
    console.log(`✅ Migradas ${migrar.length} fotos a IndexedDB`);
  }

  /* Migrar comprobantes viejos */
  const migrarComps = [];
  (window.DB.orders || []).forEach(o => {
    if(o.comprobante &&
       o.comprobante.imagen &&
       typeof o.comprobante.imagen === 'string' &&
       o.comprobante.imagen.startsWith('data:')){
      window.COMPROBANTES[o.id] = { ...o.comprobante };
      migrarComps.push(o);
    }
  });

  if(migrarComps.length){
    for(const o of migrarComps){
      try{
        await guardarComprobanteDB(o.id, window.COMPROBANTES[o.id]);
      }catch(e){
        console.warn('Migración comprobante falló para', o.id, e);
        continue;
      }
      o.comprobante = { tipo: o.comprobante.tipo };
    }
    saveDB();
    console.log(`✅ Migrados ${migrarComps.length} comprobantes a IndexedDB`);
  }
}

/* =========================================================
   CARGA DEL DB COMPLETO
   1. Intenta IndexedDB
   2. Si está vacío, migra desde localStorage
   3. Si no hay nada, arranca limpio
   ========================================================= */
async function loadDB(){
  /* --- 1. Intentar IndexedDB --- */
  let dataIDB = null;
  try{
    dataIDB = await idbGet('db');
  }catch(e){
    console.warn('⚠️ IndexedDB no disponible, usando localStorage:', e);
  }

  if(dataIDB && dataIDB.version){
    /* Copiar datos a window.DB */
    Object.keys(dataIDB).forEach(k => {
      window.DB[k] = dataIDB[k];
    });
    console.log('✅ DB cargado desde IndexedDB (v' + dataIDB.version + ')');

    /* Correr migraciones pendientes si el DB tiene versión vieja */
    if(window.DB.version < STORAGE_VERSION){
      await correrMigraciones();
    }
    return;
  }

  /* --- 2. Migrar desde localStorage --- */
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw){
    try{
      const parsed = JSON.parse(raw);

      window.DB.products   = parsed.products   || [];
      window.DB.tickets    = parsed.tickets    || [];
      window.DB.clients    = parsed.clients    || [];
      window.DB.suppliers  = parsed.suppliers  || [];
      window.DB.orders     = parsed.orders     || [];
      window.DB.categories = parsed.categories || [];
      window.DB.historialCompras = parsed.historialCompras || [];
      window.DB.shoppingLists = parsed.shoppingLists || [];
      window.DB.settings   = Object.assign(
        { currency: 'USD', refCurrency: 'VES', tasaDia: 0, tasaActualizada: null },
        parsed.settings || {}
      );
      window.DB.ventaCounter = parsed.ventaCounter || {};
      window.DB.version = parsed.version || 1;

      console.log('🔄 Migrando de localStorage a IndexedDB...');

      if(window.DB.version < STORAGE_VERSION){
        await correrMigraciones();
      } else {
        await idbSet('db', window.DB);
      }

      /* NO borrar localStorage todavía (seguridad) */
      console.log('✅ Migración a IndexedDB completa');
      return;
    }catch(e){
      console.error('❌ Error migrando de localStorage:', e);
    }
  }

  /* --- 3. Sin datos: primera vez --- */
  console.log('ℹ️ Primera vez: DB vacío');
  await idbSet('db', window.DB);
}

/* =========================================================
   MIGRACIONES
   ========================================================= */
async function correrMigraciones(){
  console.log('🔄 Migrando datos de v' + window.DB.version);

  if(window.DB.version < 2)  migrateToLotes();
  if(window.DB.version < 3)  migrateToMultiFotos();
  if(window.DB.version < 4)  migrateToTasa();
  if(window.DB.version < 5)  migrateToNomenclatura();
  if(window.DB.version < 6)  migrateToTickets();
  if(window.DB.version < 7)  migrateToClients();
  if(window.DB.version < 8)  migrateToSuppliers();
  if(window.DB.version < 9)  migrateToOrders();
  if(window.DB.version < 10) migrateToSupplierProducts();
  if(window.DB.version < 11) migrateToFotosIndexedDB();
  if(window.DB.version < 13) migrateToCategories();

  migrateCategoriasEmoji();

  window.DB.version = STORAGE_VERSION;
  await idbSet('db', window.DB);
  console.log('✅ Migración completa a v' + STORAGE_VERSION);
}

function migrateToFotosIndexedDB(){
  window.DB.products = (window.DB.products || []).map(p => {
    if(Array.isArray(p.fotos) && p.fotos.length){
      p.cantidadFotos = p.fotos.length;
    } else if(typeof p.cantidadFotos !== 'number'){
      p.cantidadFotos = 0;
    }
    return p;
  });
}

function migrateToCategories(){
  if(!Array.isArray(window.DB.categories)){
    window.DB.categories = [];
  }
}

function migrateCategoriasEmoji(){
  if(!Array.isArray(window.DB.categories)) return;
  window.DB.categories = window.DB.categories.map(c => {
    if(!c.emoji) c.emoji = '🏷️';
    return c;
  });
}

function migrateToLotes(){
  window.DB.products = window.DB.products.map(p => {
    if(Array.isArray(p.lotes) && p.lotes.length > 0){
      if(typeof p.favorito !== 'boolean') p.favorito = false;
      return p;
    }
    const uComp  = Number(p.unidadesCompradas) || 0;
    const cTotal = Number(p.costoTotalCompra) || 0;
    const costoU = uComp > 0 ? cTotal / uComp : 0;
    const loteId = 'lote_' + uid();

    const lote = {
      id: loteId,
      fecha: p.fechaCompra || todayISO(),
      unidadesCompradas: uComp,
      costoTotalCompra: cTotal,
      costoUnitario: costoU
    };

    const ventas = (p.ventas || []).map(v => {
      const venta = { ...v };
      if(typeof venta.costoUnitario !== 'number') venta.costoUnitario = costoU;
      if(!venta.loteId) venta.loteId = loteId;
      return venta;
    });

    return {
      id: p.id,
      nombre: p.nombre,
      foto: p.foto || null,
      tipoMargen: p.tipoMargen || 'porcentaje',
      valorMargen: Number(p.valorMargen) || 0,
      creado: p.creado || Date.now(),
      favorito: false,
      lotes: [lote],
      ventas: ventas
    };
  });
}

function migrateToMultiFotos(){
  window.DB.products = window.DB.products.map(p => {
    if(typeof p.foto === 'string' && p.foto){
      p.fotos = [p.foto];
      p.fotoPrincipal = 0;
      delete p.foto;
    }
    if(!Array.isArray(p.fotos)) p.fotos = [];
    if(typeof p.fotoPrincipal !== 'number' || p.fotoPrincipal >= p.fotos.length){
      p.fotoPrincipal = 0;
    }
    if(typeof p.codigoBarras === 'undefined'){
      p.codigoBarras = null;
    }
    return p;
  });
}

function migrateToTasa(){
  if(typeof window.DB.settings.refCurrency === 'undefined'){
    window.DB.settings.refCurrency = 'VES';
  }
  if(typeof window.DB.settings.tasaDia === 'undefined'){
    window.DB.settings.tasaDia = 0;
  }
  window.DB.products = window.DB.products.map(p => {
    (p.ventas || []).forEach(v => {
      if(typeof v.tasaSnapshot === 'undefined') v.tasaSnapshot = null;
      if(typeof v.refCurrencySnapshot === 'undefined') v.refCurrencySnapshot = null;
    });
    return p;
  });
}

function migrateToNomenclatura(){
  if(typeof window.DB.ventaCounter === 'undefined'){
    window.DB.ventaCounter = {};
  }
  const todasLasVentas = [];
  window.DB.products.forEach(p => {
    (p.ventas || []).forEach(v => {
      todasLasVentas.push({ venta: v, producto: p });
    });
  });
  todasLasVentas.sort((a, b) => a.venta.fecha < b.venta.fecha ? -1 : 1);
  todasLasVentas.forEach(item => {
    const v = item.venta;
    if(v.numero) return;
    const dia = v.fecha.slice(0, 10);
    const diaCompacto = dia.replace(/-/g, '');
    window.DB.ventaCounter[dia] = (window.DB.ventaCounter[dia] || 0) + 1;
    const num = String(window.DB.ventaCounter[dia]).padStart(3, '0');
    v.numero = `${diaCompacto}-${num}`;
  });
}

function migrateToTickets(){
  if(!Array.isArray(window.DB.tickets)) window.DB.tickets = [];
  window.DB.products = window.DB.products.map(p => {
    (p.ventas || []).forEach(v => {
      if(typeof v.ticketId === 'undefined') v.ticketId = null;
    });
    return p;
  });
}

function migrateToClients(){
  if(!Array.isArray(window.DB.clients)) window.DB.clients = [];
}

function migrateToSuppliers(){
  if(!Array.isArray(window.DB.suppliers)) window.DB.suppliers = [];
  window.DB.clients = (window.DB.clients || []).map(c => {
    if(typeof c.pais === 'undefined') c.pais = '';
    return c;
  });
  window.DB.products = (window.DB.products || []).map(p => {
    (p.lotes || []).forEach(l => {
      if(typeof l.proveedorId === 'undefined') l.proveedorId = null;
    });
    return p;
  });
}

function migrateToOrders(){
  if(!Array.isArray(window.DB.orders)) window.DB.orders = [];
}

function migrateToSupplierProducts(){
  window.DB.suppliers = (window.DB.suppliers || []).map(s => {
    if(!Array.isArray(s.productoIds))         s.productoIds = [];
    if(!Array.isArray(s.productoIdsOcultos))  s.productoIdsOcultos = [];
    return s;
  });
  (window.DB.products || []).forEach(p => {
    (p.lotes || []).forEach(l => {
      if(!l.proveedorId) return;
      const prov = window.DB.suppliers.find(x => x.id === l.proveedorId);
      if(!prov) return;
      if(!prov.productoIds.includes(p.id)) prov.productoIds.push(p.id);
    });
  });
}

/* =========================================================
   NOMENCLATURA
   ========================================================= */
function generarNumeroTicket(fechaISO){
  const dia = (fechaISO || todayISO()).slice(0, 10);
  const diaCompacto = dia.replace(/-/g, '');
  window.DB.ventaCounter[dia] = (window.DB.ventaCounter[dia] || 0) + 1;
  const num = String(window.DB.ventaCounter[dia]).padStart(3, '0');
  return `${diaCompacto}-${num}`;
}

function generarNumeroPedido(fechaISO){
  const dia = (fechaISO || todayISO()).slice(0, 10);
  const diaCompacto = dia.replace(/-/g, '');
  const key = 'pedido_' + dia;
  window.DB.ventaCounter[key] = (window.DB.ventaCounter[key] || 0) + 1;
  const num = String(window.DB.ventaCounter[key]).padStart(3, '0');
  return `${diaCompacto}-P${num}`;
}

/* =========================================================
   GUARDAR
   Async pero NO await (fire and forget con cola)
   ========================================================= */
function saveDB(){
  window.DB.version = STORAGE_VERSION;

  /* Cola: si está guardando, marcar pendiente */
  if(_guardando){
    _pendienteGuardar = true;
    return;
  }

  _guardando = true;

  idbSet('db', window.DB)
    .then(() => {
      _guardando = false;
      if(_pendienteGuardar){
        _pendienteGuardar = false;
        saveDB();
      }
    })
    .catch(e => {
      console.error('❌ Error guardando en IndexedDB:', e);
      _guardando = false;
      toast('⚠️ No se pudo guardar');
    });
}

/* =========================================================
   SESIÓN DE COMPRA
   ========================================================= */
function loadSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw){ window.SESSION = null; return; }
    window.SESSION = JSON.parse(raw);
    if(!window.SESSION || !window.SESSION.activa) window.SESSION = null;
  }catch(e){ window.SESSION = null; }
}

function saveSession(){
  try{
    if(!window.SESSION){
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(window.SESSION));
  }catch(e){ console.error('Error al guardar sesión:', e); }
}

function clearSession(){
  window.SESSION = null;
  localStorage.removeItem(SESSION_KEY);
}

/* =========================================================
   CARRITO
   ========================================================= */
function loadCarrito(){
  try{
    const raw = localStorage.getItem(CARRITO_KEY);
    if(!raw){ window.CARRITO = { items: [] }; return; }
    const parsed = JSON.parse(raw);
    window.CARRITO = { items: Array.isArray(parsed.items) ? parsed.items : [] };
  }catch(e){ window.CARRITO = { items: [] }; }
}

function saveCarrito(){
  try{
    localStorage.setItem(CARRITO_KEY, JSON.stringify(window.CARRITO));
  }catch(e){ console.error('Error al guardar carrito:', e); }
}

function clearCarrito(){
  window.CARRITO = { items: [] };
  localStorage.removeItem(CARRITO_KEY);
}

/* =========================================================
   RESPALDO
   ========================================================= */
async function exportBackup(){
  try{
    const payload = {
      ...window.DB,
      _fotos: window.FOTOS || {},
      _comprobantes: window.COMPROBANTES || {},
      _exportadoEn: new Date().toISOString(),
      _tipo: 'backup-completo',
      _version: STORAGE_VERSION
    };

    const json = JSON.stringify(payload);
    const blob = new Blob([json], { type: 'application/json' });
    const nombreArchivo = `stoki-backup-${todayISO()}.json`;

    /* Tamaño estimado */
    const kb = (blob.size / 1024).toFixed(0);

    if(typeof tieneCapacitor === 'function' && tieneCapacitor()){
      /* Leer como dataURL y usar exporter */
      const reader = new FileReader();
      reader.onload = async () => {
        try{
          const dataURL = reader.result;
          const r = await guardarArchivo(dataURL, nombreArchivo, 'Backup');

          if(r.ok){
            if(r.compartido){
              toast(`📤 Backup (${kb} KB) listo para compartir`);
            } else {
              toast(`💾 Backup guardado (${kb} KB)`);
            }
          } else {
            toast('⚠️ No se pudo exportar');
          }
        }catch(err){
          console.error('Error al exportar:', err);
          toast('⚠️ Error al exportar');
        }
      };
      reader.readAsDataURL(blob);
    } else {
      /* Navegador */
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nombreArchivo;
      a.click();
      toast(`💾 Backup descargado (${kb} KB)`);
    }
  }catch(e){
    console.error('Error al exportar:', e);
    toast('⚠️ Error al exportar');
  }
}

async function importBackup(file){
  const reader = new FileReader();

  reader.onload = async ev => {
    try{
      const parsed = JSON.parse(ev.target.result);
      if(!parsed.products) throw new Error('formato inválido');

      /* Confirmar reemplazo */
      const ok = await confirmarAccion({
        titulo: '¿Restaurar backup?',
        mensaje: 'Se reemplazarán TODOS los datos actuales (productos, ventas, pedidos, fotos).',
        botonOk: 'Restaurar',
        botonCancel: 'Cancelar',
        colorOk: 'rojo'
      });
      if(!ok) return;

      /* Restaurar DB principal */
      window.DB.products        = parsed.products        || [];
      window.DB.tickets         = parsed.tickets         || [];
      window.DB.clients         = parsed.clients         || [];
      window.DB.suppliers       = parsed.suppliers       || [];
      window.DB.orders          = parsed.orders          || [];
      window.DB.categories      = parsed.categories      || [];
      window.DB.historialCompras = parsed.historialCompras || [];
      window.DB.shoppingLists   = parsed.shoppingLists   || [];
      window.DB.settings = Object.assign(
        { currency: 'USD', refCurrency: 'VES', tasaDia: 0, tasaActualizada: null },
        parsed.settings || {}
      );
      window.DB.ventaCounter = parsed.ventaCounter || {};
      window.DB.version = parsed.version || 1;

      if(window.DB.version < STORAGE_VERSION){
        await correrMigraciones();
      }
      window.DB.version = STORAGE_VERSION;

      /* Guardar DB */
      await idbSet('db', window.DB);

      /* Restaurar fotos */
      const fotos = parsed._fotos || {};
      const pids = Object.keys(fotos);

      for(const pid of pids){
        try{
          await guardarFotosProducto(pid, fotos[pid]);
        }catch(e){
          console.warn('Foto no restaurada:', pid);
        }
      }

      /* Restaurar comprobantes */
      const comps = parsed._comprobantes || {};
      const oids = Object.keys(comps);

      for(const oid of oids){
        try{
          await guardarComprobanteDB(oid, comps[oid]);
        }catch(e){
          console.warn('Comprobante no restaurado:', oid);
        }
      }

      /* Recargar caché y renderizar */
      await precargarFotos();
      renderAll();

      toast(`✅ Restaurado: ${window.DB.products.length} productos, ${pids.length} fotos`);
    }catch(err){
      console.error('Error al importar:', err);
      toast('⚠️ Archivo inválido');
    }
  };

  reader.readAsText(file);
}

/* Abrir file picker para importar */
function abrirImportBackup(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = e => {
    const f = e.target.files[0];
    if(f) importBackup(f);
  };
  input.click();
}


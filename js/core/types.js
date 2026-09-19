/* =========================================================
   core/types.js — Constantes y helpers de tipos
   v1: 4 tipos de ítem + unidades + márgenes simplificados
   ========================================================= */

/* ═══════════════════════════════════════════════════════
   TIPOS DE ÍTEM
   ═══════════════════════════════════════════════════════ */
const TIPOS = {
  PRODUCTO: 'producto',   // Compra y revende directo
  MATERIAL: 'material',   // Materia prima, no vendible directo
  RECETA:   'receta',     // Combina materiales
  SERVICIO: 'servicio'    // Trabajo/tiempo, sin stock
};

const TIPOS_INFO = {
  producto: { emoji: '🟢', nombre: 'Producto', color: '#22c55e' },
  material: { emoji: '🔵', nombre: 'Material', color: '#3b82f6' },
  receta:   { emoji: '🟣', nombre: 'Receta',   color: '#a855f7' },
  servicio: { emoji: '🔴', nombre: 'Servicio', color: '#ef4444' }
};

function tipoDe(p){
  return (p && p.tipo) || TIPOS.PRODUCTO;
}

function tipoInfo(p){
  return TIPOS_INFO[tipoDe(p)] || TIPOS_INFO.producto;
}

function esVendible(p){
  if(!p) return false;
  const t = tipoDe(p);
  if(t === TIPOS.PRODUCTO) return true;
  if(t === TIPOS.RECETA)   return true;
  if(t === TIPOS.SERVICIO) return true;
  if(t === TIPOS.MATERIAL) return !!p.vendibleSuelto;
  return false;
}

function tieneStock(p){
  if(!p) return false;
  const t = tipoDe(p);
  if(t === TIPOS.SERVICIO) return false;
  if(t === TIPOS.RECETA)   return false;   /* Stock calculado, no propio */
  return true;
}

function tieneFIFO(p){
  const t = tipoDe(p);
  return t === TIPOS.PRODUCTO || t === TIPOS.MATERIAL;
}

/* ═══════════════════════════════════════════════════════
   UNIDADES DE MEDIDA
   ═══════════════════════════════════════════════════════ */
const UNIDADES = {
  unidad: { nombre: 'unidad', abreviacion: 'u',  decimales: 0 },
  kg:     { nombre: 'kilogramo', abreviacion: 'kg', decimales: 2 },
  g:      { nombre: 'gramo', abreviacion: 'g',  decimales: 2 },
  l:      { nombre: 'litro', abreviacion: 'l',  decimales: 2 },
  ml:     { nombre: 'mililitro', abreviacion: 'ml', decimales: 2 },
  m:      { nombre: 'metro', abreviacion: 'm',  decimales: 2 },
  cm:     { nombre: 'centímetro', abreviacion: 'cm', decimales: 0 }
};

/* Conversiones base (a la unidad raíz de su familia) */
const CONVERSIONES = {
  kg: { familia: 'peso', factor: 1000 },  /* 1 kg = 1000 g */
  g:  { familia: 'peso', factor: 1 },
  l:  { familia: 'volumen', factor: 1000 },
  ml: { familia: 'volumen', factor: 1 },
  m:  { familia: 'longitud', factor: 100 },
  cm: { familia: 'longitud', factor: 1 },
  unidad: { familia: 'unidad', factor: 1 }
};

function unidadInfo(u){
  return UNIDADES[u] || UNIDADES.unidad;
}

/* Convierte cantidad de una unidad a otra (misma familia) */
function convertirUnidad(cantidad, desde, hasta){
  const d = CONVERSIONES[desde];
  const h = CONVERSIONES[hasta];
  if(!d || !h || d.familia !== h.familia) return cantidad;
  return (cantidad * d.factor) / h.factor;
}

/* Formatea cantidad + unidad de forma amigable */
function fmtCantidadUnidad(cantidad, unidad){
  const u = unidadInfo(unidad);
  const c = Number(cantidad) || 0;
  const val = c.toFixed(u.decimales);
  return `${val} ${u.abreviacion}`;
}

/* ═══════════════════════════════════════════════════════
   TIPOS DE MARGEN (simplificados)
   ═══════════════════════════════════════════════════════ */
const MARGENES = {
  PORCENTAJE_UNIDAD: 'pct-unidad',  /* costo × (1 + pct/100) */
  FIJO_UNIDAD:       'fijo-unidad', /* costo + monto */
  FIJO_LOTE:         'fijo-lote',   /* (costo_lote + monto) / unidades */
  PRECIO_FIJO:       'precio-fijo'  /* precio absoluto definido a mano */
};

const MARGENES_INFO = {
  'pct-unidad':  { nombre: '% ganancia', ejemplo: '40%' },
  'fijo-unidad': { nombre: '$ fijo',      ejemplo: 'Gano $2/u' },
  'fijo-lote':   { nombre: '$ por lote',  ejemplo: 'Gano $20/bulto' },
  'precio-fijo': { nombre: '💵 precio',   ejemplo: 'Cobro $5' }
};

/* ═══════════════════════════════════════════════════════
   HELPERS DE CÁLCULO DE PRECIO (compartido)
   ═══════════════════════════════════════════════════════ */

/* Calcula precio según tipo de margen y valor */
function calcularPrecioPorMargen(costoU, unidades, tipoMargen, valorMargen){
  const costo = Number(costoU) || 0;
  const valor = Number(valorMargen) || 0;
  const u = Number(unidades) || 0;

  switch(tipoMargen){
    case MARGENES.PORCENTAJE_UNIDAD:
      return costo * (1 + valor / 100);
    case MARGENES.FIJO_UNIDAD:
      return costo + valor;
    case MARGENES.FIJO_LOTE:
      return u > 0 ? costo + (valor / u) : costo;
    case MARGENES.PRECIO_FIJO:
      return valor;
    default:
      return costo;
  }
}

/* Compatibilidad: convierte tipos de margen viejos a nuevos */
function migrarTipoMargen(tipoViejo, scopeViejo){
  if(tipoViejo === 'porcentaje')   return MARGENES.PORCENTAJE_UNIDAD;
  if(tipoViejo === 'fijo'){
    return scopeViejo === 'lote' ? MARGENES.FIJO_LOTE : MARGENES.FIJO_UNIDAD;
  }
  if(tipoViejo === 'precio')       return MARGENES.PRECIO_FIJO;
  if(tipoViejo === 'fijo-lote')    return MARGENES.FIJO_LOTE;
  if(tipoViejo === 'precio-lote')  return MARGENES.PRECIO_FIJO;
  return MARGENES.PORCENTAJE_UNIDAD;
}

/* =========================================================
   calc.js — Motor de cálculo con FIFO
   Soporta 5 tipos de precio + reservas de pedidos activos
   ========================================================= */

function calc(p){
  const lotes = getLotesConEstado(p);

  const uComp = lotes.reduce((s, l) => s + l.unidadesCompradas, 0);
  const uVend = lotes.reduce((s, l) => s + l.unidadesVendidas, 0);
  const stockBruto = lotes.reduce((s, l) => s + l.unidadesRestantes, 0);

  /* ---------- RESERVAS (pedidos activos) ---------- */
  const reservado = (typeof getReservadoProducto === 'function')
    ? getReservadoProducto(p.id)
    : 0;

  const stock = Math.max(0, stockBruto - reservado);

  /* ---------- PRECIO DE VENTA (5 casos) ---------- */
  const loteActual = getLoteActual(lotes);
  const costoU = loteActual ? loteActual.costoUnitario : 0;

  const valor = Number(p.valorMargen) || 0;
  const unidadesMargen = Number(p.unidadesMargen) || 0;
  let precioVenta = costoU;

  switch(p.tipoMargen){
    case 'porcentaje':
      precioVenta = costoU * (1 + valor / 100);
      break;
    case 'fijo':
      precioVenta = costoU + valor;
      break;
    case 'fijo-lote':
      precioVenta = costoU + (unidadesMargen > 0 ? valor / unidadesMargen : 0);
      break;
    case 'precio':
      precioVenta = valor;
      break;
    case 'precio-lote':
      precioVenta = unidadesMargen > 0 ? valor / unidadesMargen : 0;
      break;
    default:
      precioVenta = costoU * (1 + valor / 100);
  }

  const gananciaUnidad = precioVenta - costoU;

  /* ---------- VENTAS ---------- */
  const ventas = p.ventas || [];
  const inversion = lotes.reduce((s, l) => s + l.costoTotalCompra, 0);

  let ingreso = 0;
  let costoVendido = 0;

  ventas.forEach(v => {
    const cant = Number(v.cantidad) || 0;
    const precio = Number(v.precioUnitario) || 0;
    const costoSnapshot = Number(v.costoUnitario);

    const costoAplicado = !isNaN(costoSnapshot)
      ? costoSnapshot
      : (lotes[0] ? lotes[0].costoUnitario : 0);

    ingreso += cant * precio;
    costoVendido += cant * costoAplicado;
  });

  const gananciaReal = ingreso - costoVendido;
  const saldo = ingreso - inversion;

  const ingresoFuturo = stock * precioVenta;
  const ganPotencial = (ingreso + ingresoFuturo) - inversion;

  const progreso = inversion > 0
    ? Math.min(100, (ingreso / inversion) * 100)
    : 0;

  const uEquilibrio = precioVenta > 0
    ? Math.max(0, Math.ceil((inversion - ingreso) / precioVenta))
    : 0;

  const estadoStock = getEstadoStock(stock, lotes);
  const comparativa = getComparativa(lotes);

  return {
    /* Lotes */
    lotes,
    loteActual,

    /* Precio */
    costoU,
    precioVenta,
    gananciaUnidad,

    /* Stock */
    uComp,
    uVend,
    stock,               /* stock disponible = restantes − reservas */
    stockBruto,          /* restantes sin restar reservas */
    reservado,           /* unidades reservadas por pedidos activos */
    estadoStock,

    /* Dinero */
    inversion,
    ingreso,
    costoVendido,
    gananciaReal,
    saldo,
    ganPotencial,

    /* Progreso */
    progreso,
    uEquilibrio,

    /* Comparativa de precios */
    mejorPrecio:   comparativa.mejor,
    peorPrecio:    comparativa.peor,
    precioPromedio: comparativa.promedio
  };
}

/* =========================================================
   FIFO — Distribuir ventas entre lotes
   ========================================================= */
function getLotesConEstado(p){
  const lotesOriginales = Array.isArray(p.lotes) ? p.lotes : [];
  const ventas = Array.isArray(p.ventas) ? p.ventas : [];

  const lotes = lotesOriginales.map(l => ({
    ...l,
    unidadesVendidas: 0,
    unidadesRestantes: l.unidadesCompradas
  }));

  lotes.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  const ventasOrdenadas = [...ventas].sort((a, b) =>
    a.fecha < b.fecha ? -1 : 1
  );

  ventasOrdenadas.forEach(v => {
    let cant = Number(v.cantidad) || 0;
    if(cant <= 0) return;

    for(const lote of lotes){
      if(cant <= 0) break;
      if(lote.unidadesRestantes <= 0) continue;

      const consumir = Math.min(cant, lote.unidadesRestantes);
      lote.unidadesRestantes -= consumir;
      lote.unidadesVendidas += consumir;
      cant -= consumir;
    }
  });

  return lotes;
}

/* =========================================================
   LOTE ACTUAL — el más reciente con stock
   ========================================================= */
function getLoteActual(lotes){
  if(!lotes.length) return null;

  const conStock = lotes.filter(l => l.unidadesRestantes > 0);

  if(conStock.length){
    return conStock[conStock.length - 1];
  }

  return lotes[lotes.length - 1];
}

/* =========================================================
   ESTADO DE STOCK — para alertas visuales
   ========================================================= */
function getEstadoStock(stock, lotes){
  if(stock <= 0) return 'agotado';
  if(!lotes.length) return 'agotado';

  const ultimo = lotes[lotes.length - 1];
  const tamanioUltimo = ultimo.unidadesCompradas;
  if(tamanioUltimo <= 0) return 'ok';

  const ratio = stock / tamanioUltimo;

  if(ratio < 0.30) return 'urgente';
  if(ratio < 0.50) return 'atencion';
  return 'ok';
}

/* =========================================================
   COMPARATIVA — mejor y peor precio histórico
   ========================================================= */
function getComparativa(lotes){
  if(!lotes.length){
    return { mejor: null, peor: null, promedio: 0 };
  }

  let mejor = lotes[0];
  let peor = lotes[0];
  let costoTotal = 0;
  let unidadesTotal = 0;

  lotes.forEach(l => {
    if(l.costoUnitario < mejor.costoUnitario) mejor = l;
    if(l.costoUnitario > peor.costoUnitario) peor = l;
    costoTotal += l.costoTotalCompra;
    unidadesTotal += l.unidadesCompradas;
  });

  return {
    mejor: {
      precio: mejor.costoUnitario,
      fecha: mejor.fecha,
      loteId: mejor.id
    },
    peor: {
      precio: peor.costoUnitario,
      fecha: peor.fecha,
      loteId: peor.id
    },
    promedio: unidadesTotal > 0 ? costoTotal / unidadesTotal : 0
  };
}
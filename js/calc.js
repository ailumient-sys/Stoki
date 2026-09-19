/* =========================================================
   calc.js — Motor de cálculo con 4 tipos
   v15: producto, material, receta, servicio
   ========================================================= */

/* =========================================================
   DISPATCHER PRINCIPAL
   ========================================================= */
function calc(p){
  if(!p) return calcVacio();

  const t = tipoDe(p);

  if(t === TIPOS.SERVICIO) return calcServicio(p);
  if(t === TIPOS.RECETA)   return calcReceta(p);
  if(t === TIPOS.MATERIAL) return calcMaterial(p);
  return calcProducto(p);
}

function calcVacio(){
  return {
    tipo: 'producto',
    lotes: [], loteActual: null,
    costoU: 0, precioVenta: 0, gananciaUnidad: 0,
    uComp: 0, uVend: 0, stock: 0, stockBruto: 0, reservado: 0,
    estadoStock: 'agotado',
    inversion: 0, ingreso: 0, costoVendido: 0,
    gananciaReal: 0, saldo: 0, ganPotencial: 0,
    progreso: 0, uEquilibrio: 0,
    mejorPrecio: null, peorPrecio: null, precioPromedio: 0
  };
}

/* =========================================================
   🟢 PRODUCTO — compra y reventa directa
   ========================================================= */
function calcProducto(p){
  const lotes = getLotesConEstado(p);

  const uComp = lotes.reduce((s, l) => s + l.unidadesCompradas, 0);
  const uVend = lotes.reduce((s, l) => s + l.unidadesVendidas, 0);
  const stockBruto = lotes.reduce((s, l) => s + l.unidadesRestantes, 0);

  /* Reservas por pedidos activos */
  const reservado = (typeof getReservadoProductoTotal === 'function')
    ? getReservadoProductoTotal(p.id)
    : ((typeof getReservadoProducto === 'function') ? getReservadoProducto(p.id) : 0);

  const stock = Math.max(0, stockBruto - reservado);

  /* Costo FIFO actual */
  const loteActual = getLoteActual(lotes);
  const costoU = loteActual ? loteActual.costoUnitario : 0;

  /* Precio de venta */
  const tipoMargen = p.tipoMargen || MARGENES.PORCENTAJE_UNIDAD;
  const precioVenta = calcularPrecioPorMargen(
    costoU, uComp, tipoMargen, p.valorMargen
  );

  const gananciaUnidad = precioVenta - costoU;

  /* Ventas */
  const ventas = Array.isArray(p.ventas) ? p.ventas : [];
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
    tipo: 'producto',
    lotes, loteActual,
    unidad: p.unidad || 'unidad',
    costoU, precioVenta, gananciaUnidad,
    uComp, uVend, stock, stockBruto, reservado,
    estadoStock,
    inversion, ingreso, costoVendido, gananciaReal, saldo, ganPotencial,
    progreso, uEquilibrio,
    mejorPrecio: comparativa.mejor,
    peorPrecio: comparativa.peor,
    precioPromedio: comparativa.promedio
  };
}

/* =========================================================
   🔵 MATERIAL — insumo, mismo cálculo que producto pero
   sin precio de venta (salvo si es vendible suelto)
   ========================================================= */
function calcMaterial(p){
  const base = calcProducto(p);

  base.tipo = 'material';
  base.vendibleSuelto = !!p.vendibleSuelto;

  /* Si NO es vendible suelto, no mostrar precio de venta */
  if(!p.vendibleSuelto){
    base.precioVenta = 0;
    base.gananciaUnidad = 0;
    base.ganPotencial = 0;
    base.uEquilibrio = 0;
  }

  return base;
}

/* =========================================================
   🟣 RECETA — calcula costo sumando componentes
   El stock se calcula por explosión de materiales
   ========================================================= */
function calcReceta(p){
  const componentes = Array.isArray(p.componentes) ? p.componentes : [];

  /* ── Explosión de componentes a materiales base ── */
  const explotado = explotarComponentes(componentes);

  /* ── Calcular stock disponible = mínimo entre todos los materiales ── */
  let stockDisponible = Infinity;
  let limitadoPor = null;
  let detalleComponentes = [];

  if(explotado.length === 0){
    stockDisponible = 0;
  } else {
    explotado.forEach(comp => {
      const mat = window.DB.products.find(x => x.id === comp.materialId);
      if(!mat){
        detalleComponentes.push({
          ...comp,
          existe: false,
          stockMat: 0,
          alcanza: 0
        });
        stockDisponible = 0;
        return;
      }

      const cMat = calcMaterial(mat);
      const alcance = comp.cantidad > 0
        ? Math.floor(cMat.stock / comp.cantidad)
        : 0;

      detalleComponentes.push({
        ...comp,
        material: mat,
        existe: true,
        stockMat: cMat.stock,
        costoUnitario: cMat.costoU,
        alcanza: alcance
      });

      if(alcance < stockDisponible){
        stockDisponible = alcance;
        limitadoPor = mat.nombre;
      }
    });
  }

  if(stockDisponible === Infinity) stockDisponible = 0;

  /* ── Calcular costo por unidad de receta ── */
  let costoReceta = 0;
  let costoCompleto = true;

  detalleComponentes.forEach(c => {
    if(c.existe && c.costoUnitario != null){
      costoReceta += c.costoUnitario * c.cantidad;
    } else {
      costoCompleto = false;
    }
  });

  /* ── Precio de venta y ganancia ── */
  const precioVenta = Number(p.valorMargen) || 0;
  const gananciaUnidad = precioVenta - costoReceta;
  const margenPct = costoReceta > 0
    ? (gananciaUnidad / costoReceta) * 100
    : 0;

  /* ── Ventas de receta ── */
  const ventas = Array.isArray(p.ventas) ? p.ventas : [];
  let ingreso = 0;
  let costoVendido = 0;
  let uVend = 0;

  ventas.forEach(v => {
    const cant = Number(v.cantidad) || 0;
    const precio = Number(v.precioUnitario) || 0;
    const costo = Number(v.costoUnitario) || costoReceta;

    ingreso += cant * precio;
    costoVendido += cant * costo;
    uVend += cant;
  });

  const gananciaReal = ingreso - costoVendido;
  const stockInfinito = !!p.stockInfinito;

  return {
    tipo: 'receta',
    unidad: p.unidad || 'unidad',
    componentes: detalleComponentes,
    limitadoPor,
    stock: stockInfinito ? Infinity : stockDisponible,
    stockDisponible,
    stockInfinito,
    costoU: costoReceta,
    precioVenta,
    gananciaUnidad,
    margenPct,
    uVend,
    ingreso,
    costoVendido,
    gananciaReal,
    /* No aplican a receta */
    lotes: [],
    loteActual: null,
    uComp: 0,
    stockBruto: 0,
    reservado: 0,
    estadoStock: stockDisponible > 5 ? 'ok' : (stockDisponible > 0 ? 'atencion' : 'agotado'),
    inversion: 0,
    saldo: 0,
    ganPotencial: 0,
    progreso: 0,
    uEquilibrio: 0,
    mejorPrecio: null,
    peorPrecio: null,
    precioPromedio: 0,
    /* Extra */
    costoCompleto
  };
}

/* =========================================================
   🔴 SERVICIO — vende tiempo/trabajo
   ========================================================= */
function calcServicio(p){
  const precio = Number(p.valorMargen) || 0;

  /* Consumibles (opcional) */
  const consumibles = Array.isArray(p.consumibles) ? p.consumibles : [];
  let costoConsumibles = 0;

  const detalleConsumibles = consumibles.map(c => {
    const mat = window.DB.products.find(x => x.id === c.materialId);
    if(!mat) return { ...c, existe: false };

    const cMat = calcMaterial(mat);
    const cost = cMat.costoU * c.cantidad;
    costoConsumibles += cost;

    return {
      ...c,
      material: mat,
      existe: true,
      costoUnitario: cMat.costoU,
      stockMat: cMat.stock,
      costoTotal: cost,
      alcanza: c.cantidad > 0 ? Math.floor(cMat.stock / c.cantidad) : 0
    };
  });

  const gananciaNeta = precio - costoConsumibles;

  /* Ventas del servicio */
  const ventas = Array.isArray(p.ventas) ? p.ventas : [];
  let ingreso = 0;
  let uVend = 0;

  ventas.forEach(v => {
    const cant = Number(v.cantidad) || 0;
    const precioUnit = Number(v.precioUnitario) || precio;

    ingreso += cant * precioUnit;
    uVend += cant;
  });

  const costoVendido = uVend * costoConsumibles;
  const gananciaReal = ingreso - costoVendido;

  return {
    tipo: 'servicio',
    consumibles: detalleConsumibles,
    duracion: Number(p.duracion) || 0,
    descripcion: p.descripcion || '',
    /* Precio */
    costoU: costoConsumibles,
    precioVenta: precio,
    gananciaUnidad: gananciaNeta,
    gananciaNeta,
    /* Stock siempre infinito */
    stock: Infinity,
    stockInfinito: true,
    stockDisponible: Infinity,
    /* Ventas */
    uVend,
    ingreso,
    costoVendido,
    gananciaReal,
    /* No aplican */
    lotes: [],
    loteActual: null,
    uComp: 0,
    stockBruto: 0,
    reservado: 0,
    estadoStock: 'ok',
    inversion: 0,
    saldo: 0,
    ganPotencial: 0,
    progreso: 0,
    uEquilibrio: 0,
    mejorPrecio: null,
    peorPrecio: null,
    precioPromedio: 0,
    unidad: 'unidad'
  };
}

/* =========================================================
   EXPLOSIÓN DE COMPONENTES
   Convierte recetas con sub-recetas en lista plana de materiales
   (por ahora: 1 nivel de sub-receta)
   ========================================================= */
function explotarComponentes(componentes, nivel = 0){
  const out = [];

  if(nivel > 2){
    console.warn('[calcReceta] Demasiados niveles de sub-recetas');
    return out;
  }

  (componentes || []).forEach(comp => {
    const item = window.DB.products.find(x => x.id === comp.id);
    if(!item) return;

    const t = tipoDe(item);

    if(t === TIPOS.MATERIAL){
      /* Es material directo */
      out.push({
        materialId: item.id,
        nombre: item.nombre,
        cantidad: comp.cantidad,
        unidad: item.unidad || 'unidad'
      });
    } else if(t === TIPOS.PRODUCTO && item.tambienMaterial){
      /* Producto que también es material */
      out.push({
        materialId: item.id,
        nombre: item.nombre,
        cantidad: comp.cantidad,
        unidad: item.unidad || 'unidad'
      });
    } else if(t === TIPOS.RECETA){
      /* Es sub-receta: explotar sus componentes multiplicados */
      const subComp = Array.isArray(item.componentes) ? item.componentes : [];
      const multiplicados = subComp.map(sc => ({
        ...sc,
        cantidad: sc.cantidad * comp.cantidad
      }));
      const explotadoSub = explotarComponentes(multiplicados, nivel + 1);
      explotadoSub.forEach(e => out.push(e));
    }
  });

  return out;
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

/* =========================================================
   RESERVA DE MATERIALES POR PEDIDOS
   Cuando un pedido activo contiene recetas, sus materiales
   quedan reservados hasta cerrarlo.
   ========================================================= */
function getReservadoMaterial(materialId){
  let reservado = 0;

  (window.DB.orders || []).forEach(o => {
    if(o.estado !== 'activo') return;

    (o.items || []).forEach(item => {
      /* Si el item es una receta, mirar sus componentes */
      const p = window.DB.products.find(x => x.id === item.productoId);
      if(!p) return;
      if(tipoDe(p) !== 'receta') return;

      const comps = Array.isArray(p.componentes) ? p.componentes : [];
      comps.forEach(comp => {
        const explotado = explotarComponentes([comp], 0);
        explotado.forEach(e => {
          if(e.materialId === materialId){
            reservado += e.cantidad * (item.cantidad || 0);
          }
        });
      });
    });
  });

  return reservado;
}

/* Override de getReservadoProducto: suma reservas directas + por recetas */
function getReservadoProductoTotal(productoId){
  const directo = (typeof getReservadoProducto === 'function')
    ? getReservadoProducto(productoId)
    : 0;
  const porReceta = getReservadoMaterial(productoId);
  return directo + porReceta;
}

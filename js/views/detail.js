/* =========================================================
   views/detail.js — Detalle del producto
   Con termómetro bipolar + badge "Único" si no es restockeable.
   v11: fotos desde IndexedDB vía getFotosProducto()
   ========================================================= */

function openDetail(id){
  const p = window.DB.products.find(x => x.id === id);
  if(!p) return;

  const t = tipoDe(p);
  const c = calc(p);
  const body = $('#detail-body');
  if(!body) return;

  let html = '';

  if(t === 'servicio')      html = buildDetailServicio(p, c);
  else if(t === 'receta')   html = buildDetailReceta(p, c);
  else if(t === 'material') html = buildDetailMaterial(p, c);
  else                      html = buildDetailProducto(p, c);

  body.innerHTML = html;

  /* Bind de botones comunes */
  const btnEdit = $('#d-edit');
  if(btnEdit) btnEdit.onclick = () => {
    closeModal('#m-detail');
    openEditForm(id);
  };

  const btnDel = $('#d-del');
  if(btnDel) btnDel.onclick = () => eliminarProducto(id, p.nombre);

  /* Registrar pérdida (solo producto y material) */
  const btnMerma = $('#d-merma');
  if(btnMerma){
    btnMerma.onclick = () => {
      closeModal('#m-detail');
      if(typeof abrirMovimiento === 'function'){
        abrirMovimiento({ tipo: 'merma', itemId: id });
      } else {
        toast('⚠️ Movimientos no disponible');
      }
    };
  }

  /* Solo productos y materiales tienen Agregar stock */
  const btnStock = $('#d-stock');
  if(btnStock){
    btnStock.onclick = () => {
      closeModal('#m-detail');
      if(typeof abrirRestockItem === 'function') abrirRestockItem(id);
      else toast('⚠️ Restock no disponible');
    };
  }

  openModal('#m-detail');
}

/* Renombrar el viejo buildDetailHTML a buildDetailProducto */
function buildDetailProducto(p, c){
  const enRojo = c.saldo < 0;
  return buildDetailHTML(p, c, enRojo);
}

/* =========================================================
   CARRUSEL DE FOTOS (lee desde IndexedDB vía getFotosProducto)
   ========================================================= */
function buildCarrusel(p){
  const fotos = getFotosProducto(p);
  const principal = typeof p.fotoPrincipal === 'number' ? p.fotoPrincipal : 0;

  if(!fotos.length){
    const inicial = esc((p.nombre || '?').charAt(0).toUpperCase());
    return `
      <div class="foto-carrusel">
        <div class="foto-carrusel-item" style="background:var(--bg3);
             display:flex;align-items:center;justify-content:center;
             font-size:64px;font-weight:800;color:var(--dim);">
          ${inicial}
        </div>
      </div>`;
  }

  return `
    <div class="foto-carrusel" data-total="${fotos.length}">
      <div class="foto-carrusel-track">
        ${fotos.map((f) => `
          <div class="foto-carrusel-item" style="background-image:url('${f}')"></div>
        `).join('')}
      </div>
      ${fotos.length > 1 ? `
        <div class="foto-carrusel-dots">
          ${fotos.map((_, i) =>
            `<span class="${i === principal ? 'active' : ''}"></span>`
          ).join('')}
        </div>
      ` : ''}
    </div>`;
}

/* =========================================================
   TERMÓMETRO BIPOLAR
   ========================================================= */
function buildTermometro(c){
  const inversion = c.inversion;
  const ingreso   = c.ingreso;
  const enRojo    = c.saldo < 0;

  let posicion = 0;

  if(inversion > 0){
    if(ingreso < inversion){
      posicion = 50 * (ingreso / inversion);
    } else {
      const ganActual = ingreso - inversion;
      const ganMax    = c.ganPotencial;

      if(ganMax > 0){
        posicion = 50 + 50 * Math.min(1, ganActual / ganMax);
      } else {
        posicion = 50;
      }
    }
  }

  posicion = Math.round(posicion * 10) / 10;

  const claseColor = enRojo ? 'rojo' : (c.saldo === 0 ? 'neutro' : 'verde');

  let titulo, subtitulo;
  if(enRojo){
    titulo = `🔴 Te faltan ${fmt(Math.abs(c.saldo))} para recuperar`;
    subtitulo = `Inversión: ${fmt(inversion)} · Recuperado: ${fmt(ingreso)}`;
  } else if(c.saldo === 0){
    titulo = `⚪ Recuperaste la inversión`;
    subtitulo = `Inversión: ${fmt(inversion)} · Recuperado: ${fmt(ingreso)}`;
  } else {
    titulo = `🟢 Ya ganaste ${fmt(c.saldo)}`;
    subtitulo = `Inversión: ${fmt(inversion)} · Recuperado: ${fmt(ingreso)}`;
  }

  const faltantes = enRojo ? c.uEquilibrio : 0;

  let unidadesInfo;
  if(c.uVend === 0){
    unidadesInfo = `Sin ventas todavía · ${c.uComp} u. disponibles`;
  } else if(enRojo){
    unidadesInfo = `Faltan ${faltantes} u. para equilibrio`;
  } else if(c.stock === 0){
    unidadesInfo = `Todo vendido ✅ · Ganancia final: ${fmt(c.saldo)}`;
  } else {
    unidadesInfo = `${c.stock} u. restantes en stock`;
  }

  return `
    <div class="termo-wrap">
      <div class="termo-titulo ${claseColor}">${titulo}</div>
      <div class="termo-subtitulo">${subtitulo}</div>

      <div class="termo-bar">
        <div class="termo-half termo-half-left"></div>
        <div class="termo-half termo-half-right"></div>
        <div class="termo-center"></div>
        <div class="termo-marker ${claseColor}" style="left:${posicion}%"></div>
      </div>

      <div class="termo-labels">
        <span>← Perdiendo</span>
        <span>Ganando →</span>
      </div>

      <div class="termo-info">
        <div class="termo-info-item">
          <span class="termo-info-label">Vendidos</span>
          <span class="termo-info-valor">${c.uVend} / ${c.uComp}</span>
        </div>
        <div class="termo-info-item" style="text-align:right">
          <span class="termo-info-label">Estado</span>
          <span class="termo-info-valor" style="color:${enRojo ? 'var(--red)' : 'var(--green)'}">
            ${enRojo ? 'En recuperación' : (c.saldo === 0 ? 'Neutro' : 'En ganancia')}
          </span>
        </div>
      </div>

      <div class="termo-subtitulo" style="margin-top:10px;margin-bottom:0;text-align:center">
        ${unidadesInfo}
      </div>
    </div>`;
}

/* =========================================================
   HTML COMPLETO
   ========================================================= */
function buildDetailHTML(p, c, enRojo){
  const carrusel = buildCarrusel(p);
  const termo = buildTermometro(c);
  const esRestockeable = (p.restockeable !== false);

  const fechaPrimera = c.lotes.length ? c.lotes[0].fecha : '—';

  const codigoBadge = p.codigoBarras
    ? `<div class="meta" style="margin-top:4px;font-size:11px;color:var(--dim)">
         🏷️ ${esc(p.codigoBarras)}
       </div>`
    : '';

  const unicoBadge = !esRestockeable
    ? `<div class="badge-unico" style="margin-top:6px">🔒 Producto único</div>`
    : '';

  const costoDescBadge = p.costoDesconocido
    ? `<div class="badge-unico" style="margin-top:6px;background:rgba(245,158,11,.15);color:var(--amber)">⚠️ Costo no registrado · se completa en el primer restock</div>`
    : '';

  const btnRestock = esRestockeable
    ? `<button class="btn-main" id="d-restock">📦 Reabastecer</button>`
    : '';

  const lotesHTML = c.lotes.length > 1
    ? `
      <div class="detail-lotes">
        <div class="detail-lotes-title">📦 Historial de compras</div>
        ${c.lotes.map(l => `
          <div class="detail-lote">
            <span>${l.fecha}</span>
            <span>${l.unidadesCompradas} u · ${fmt(l.costoUnitario)}/u</span>
          </div>
        `).join('')}
      </div>
    `
    : '';

  return `
    ${carrusel}

    <div style="margin-bottom:16px">
      <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;letter-spacing:-.3px">
        ${esc(p.nombre)}
      </h2>
      <div class="meta">
        Desde ${fechaPrimera}
        · ${c.lotes.length} ${c.lotes.length === 1 ? 'compra' : 'compras'}
      </div>
      ${codigoBadge}
      ${unicoBadge}
      ${costoDescBadge}
    </div>

    ${termo}

    <div class="kpis">
      <div class="kbox">
        <div class="k">Inversión</div>
        <div class="v">${fmtDual(c.inversion)}</div>
      </div>
      <div class="kbox">
        <div class="k">Ingresos</div>
        <div class="v">${fmtDual(c.ingreso)}</div>
      </div>
      <div class="kbox">
        <div class="k">Costo actual</div>
        <div class="v">${fmtDual(c.costoU)}</div>
      </div>
      <div class="kbox">
        <div class="k">Precio venta</div>
        <div class="v" style="color:var(--green)">${fmtDual(c.precioVenta)}</div>
      </div>
      <div class="kbox">
        <div class="k">Vendidos</div>
        <div class="v">${c.uVend} / ${c.uComp}</div>
      </div>
      <div class="kbox">
        <div class="k">Stock</div>
        <div class="v">${c.stock}</div>
      </div>
      <div class="kbox">
        <div class="k">Ganancia real</div>
        <div class="v" style="color:${c.gananciaReal >= 0 ? 'var(--green)' : 'var(--red)'}">
          ${fmtDual(c.gananciaReal)}
        </div>
      </div>
      <div class="kbox">
        <div class="k">Ganancia potencial</div>
        <div class="v">${fmtDual(c.ganPotencial)}</div>
      </div>
    </div>

    ${lotesHTML}

    ${btnRestock}
    <button class="btn-ghost" id="d-edit">✏️ Editar producto</button>
    <button class="btn-ghost" id="d-merma" style="color:var(--amber)">⚠️ Registrar pérdida</button>
    <button class="btn-ghost btn-danger" id="d-del">Eliminar producto</button>
  `;
}

/* ---------- Eliminar (borra fotos de IndexedDB) ---------- */
async function eliminarProducto(id, nombre){
  const ok = await confirmarAccion({
    titulo: `¿Eliminar "${nombre}"?`,
    mensaje: 'Se borrarán todas las ventas y lotes asociados.',
    botonOk: 'Eliminar',
    botonCancel: 'Cancelar',
    colorOk: 'rojo'
  });

  if(!ok) return;

  /* Borrar fotos de IndexedDB */
  try{
    await eliminarFotosProducto(id);
  }catch(e){
    console.warn('No se pudieron borrar fotos:', e);
  }
  delete window.FOTOS[id];

  window.DB.products = window.DB.products.filter(x => x.id !== id);

  saveDB();
  renderAll();
  closeModal('#m-detail');
  toast('🗑️ Producto eliminado');
}

/* =========================================================
   DETALLE — MATERIAL
   ========================================================= */
function buildDetailMaterial(p, c){
  const carrusel = buildCarrusel(p);
  const unidad = p.unidad || 'unidad';
  const ui = unidadInfo(unidad);
  const stockTxt = fmtCantidadUnidad(c.stock, unidad);
  const colorStock = { ok:'var(--green)', atencion:'var(--amber)', urgente:'var(--red)', agotado:'var(--dim)' }[c.estadoStock];

  const codigoBadge = p.codigoBarras
    ? `<div class="meta" style="margin-top:4px;font-size:11px;color:var(--dim)">🏷️ ${esc(p.codigoBarras)}</div>`
    : '';

  /* Recetas donde se usa este material */
  const recetasQueLoUsan = (window.DB.products || []).filter(x => {
    if(tipoDe(x) !== 'receta') return false;
    return (x.componentes || []).some(comp => comp.id === p.id);
  });

  const usosHTML = recetasQueLoUsan.length
    ? `
      <div class="detail-lotes">
        <div class="detail-lotes-title">🍽️ Usado en recetas</div>
        ${recetasQueLoUsan.map(r => `
          <div class="detail-lote">
            <span>${esc(r.nombre)}</span>
            <span>${(r.componentes.find(x=>x.id===p.id)||{}).cantidad || 0} ${ui.abreviacion}</span>
          </div>
        `).join('')}
      </div>`
    : '';

  /* Botón "Vendible suelto" solo si aplica */
  const vendibleBadge = p.vendibleSuelto
    ? `<div class="badge-unico" style="background:rgba(34,197,94,.15);color:var(--green)">🛒 Vendible suelto</div>`
    : '';

  return `
    ${carrusel}

    <div style="margin-bottom:16px">
      <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;letter-spacing:-.3px">
        ${esc(p.nombre)}
      </h2>
      <div class="meta">
        🔵 Material · Unidad: ${ui.nombre}
      </div>
      ${codigoBadge}
      ${vendibleBadge}
    </div>

    <div class="kpis">
      <div class="kbox">
        <div class="k">Stock</div>
        <div class="v" style="color:${colorStock}">${stockTxt}</div>
      </div>
      <div class="kbox">
        <div class="k">Costo actual</div>
        <div class="v">${fmt(c.costoU)} / ${ui.abreviacion}</div>
      </div>
      <div class="kbox">
        <div class="k">Inversión</div>
        <div class="v">${fmtDual(c.inversion)}</div>
      </div>
      <div class="kbox">
        <div class="k">Recuperado</div>
        <div class="v">${fmtDual(c.ingreso)}</div>
      </div>
    </div>

    ${p.vendibleSuelto ? `
    <div class="kpis">
      <div class="kbox">
        <div class="k">Precio venta</div>
        <div class="v" style="color:var(--green)">${fmt(c.precioVenta)} / ${ui.abreviacion}</div>
      </div>
    </div>
    ` : ''}

    ${usosHTML}

    ${buildHistorialPreciosMaterial(p)}

    <button class="btn-main" id="d-stock">➕ Agregar stock</button>
    <button class="btn-ghost" id="d-edit">✏️ Editar material</button>
    <button class="btn-ghost" id="d-merma" style="color:var(--amber)">⚠️ Registrar pérdida</button>
    <button class="btn-ghost btn-danger" id="d-del">Eliminar material</button>
  `;
}

/* =========================================================
   DETALLE — RECETA
   ========================================================= */
function buildDetailReceta(p, c){
  const carrusel = buildCarrusel(p);

  const codigoBadge = p.codigoBarras
    ? `<div class="meta" style="margin-top:4px;font-size:11px;color:var(--dim)">🏷️ ${esc(p.codigoBarras)}</div>`
    : '';

  /* Faltantes: qué falta para hacer al menos 1 más */
  let faltantesHTML = '';
  if(c.stockDisponible === 0 && c.componentes.length){
    const faltan = c.componentes.filter(comp => !comp.existe || comp.alcanza === 0);
    if(faltan.length){
      faltantesHTML = `
        <div class="restock-alert show" style="background:rgba(245,158,11,.14);color:var(--amber);margin-bottom:14px">
          ⚠️ Faltan materiales: ${faltan.map(f => esc(f.nombre)).join(', ')}
        </div>`;
    }
  }

  /* Composición */
  const compHTML = c.componentes.map(comp => {
    const existe = comp.existe;
    const alcanza = comp.alcanza || 0;
    const colorAlcanza = alcanza === 0 ? 'var(--red)' : alcanza <= 3 ? 'var(--amber)' : 'var(--green)';
    const ui = unidadInfo(comp.unidad);

    return `
      <div class="detail-lote" style="align-items:flex-start;flex-direction:column;gap:4px">
        <div style="display:flex;justify-content:space-between;width:100%">
          <span style="font-weight:800;color:var(--txt)">
            ${existe ? '🧩' : '❓'} ${esc(comp.nombre)}
          </span>
          <span style="font-weight:800">
            ${fmtCantidadUnidad(comp.cantidad, comp.unidad)}
          </span>
        </div>
        ${existe ? `
          <div style="display:flex;justify-content:space-between;width:100%;font-size:10px;color:var(--dim)">
            <span>Stock: ${fmtCantidadUnidad(comp.stockMat, comp.unidad)}</span>
            <span style="color:${colorAlcanza}">
              ${alcanza > 0 ? `Alcanza para ${alcanza}` : '⚠️ Sin stock'}
            </span>
          </div>
        ` : '<div style="font-size:10px;color:var(--red)">Producto no encontrado</div>'}
      </div>`;
  }).join('');

  const limitadoPor = c.limitadoPor
    ? `<div style="font-size:12px;color:var(--amber);font-weight:700;margin-top:8px">
         ⚠️ Limitado por: ${esc(c.limitadoPor)}
       </div>`
    : '';

  return `
    ${carrusel}

    <div style="margin-bottom:16px">
      <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;letter-spacing:-.3px">
        ${esc(p.nombre)}
      </h2>
      <div class="meta">🟣 Receta</div>
      ${codigoBadge}
    </div>

    ${faltantesHTML}

    <div class="kpis">
      <div class="kbox">
        <div class="k">Alcanza para</div>
        <div class="v" style="color:${c.stockDisponible === 0 ? 'var(--red)' : 'var(--green)'}">
          ${c.stockDisponible} ${c.stockDisponible === 1 ? 'unidad' : 'unidades'}
        </div>
      </div>
      <div class="kbox">
        <div class="k">Precio venta</div>
        <div class="v" style="color:var(--green)">${fmt(c.precioVenta)}</div>
      </div>
      <div class="kbox">
        <div class="k">Costo materiales</div>
        <div class="v">${fmt(c.costoU)}</div>
      </div>
      <div class="kbox">
        <div class="k">Ganancia</div>
        <div class="v">${fmt(c.gananciaUnidad)} (${c.margenPct.toFixed(0)}%)</div>
      </div>
    </div>

    ${limitadoPor}

    <div class="detail-lotes">
      <div class="detail-lotes-title">🧩 Composición</div>
      ${compHTML}
    </div>

    <button class="btn-ghost" id="d-edit">✏️ Editar receta</button>
    <button class="btn-ghost btn-danger" id="d-del">Eliminar receta</button>
  `;
}

/* =========================================================
   DETALLE — SERVICIO
   ========================================================= */
function buildDetailServicio(p, c){
  const carrusel = buildCarrusel(p);

  const codigoBadge = p.codigoBarras
    ? `<div class="meta" style="margin-top:4px;font-size:11px;color:var(--dim)">🏷️ ${esc(p.codigoBarras)}</div>`
    : '';

  const duracionHTML = c.duracion > 0
    ? `<div class="meta">⏱️ ${c.duracion} min</div>`
    : '';

  const descHTML = c.descripcion
    ? `<div style="background:var(--bg3);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--txt);margin-bottom:14px;line-height:1.5">${esc(c.descripcion)}</div>`
    : '';

  /* Consumibles (se oculta si no hay) */
  let consumHTML = '';
  if(c.consumibles.length){
    consumHTML = `
      <div class="detail-lotes">
        <div class="detail-lotes-title">🧩 Consumibles</div>
        ${c.consumibles.map(cons => `
          <div class="detail-lote" style="align-items:flex-start;flex-direction:column;gap:4px">
            <div style="display:flex;justify-content:space-between;width:100%">
              <span style="font-weight:800;color:var(--txt)">
                ${cons.existe ? '🧴' : '❓'} ${esc(cons.material ? cons.material.nombre : 'Desconocido')}
              </span>
              <span style="font-weight:800">
                ${fmtCantidadUnidad(cons.cantidad, cons.material ? cons.material.unidad : 'unidad')}
              </span>
            </div>
            ${cons.existe && cons.alcanza > 0 ? `
              <div style="font-size:10px;color:var(--dim);text-align:right;width:100%">
                Alcanza para ${cons.alcanza} servicios
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>`;
  }

  return `
    ${carrusel}

    <div style="margin-bottom:16px">
      <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;letter-spacing:-.3px">
        ${esc(p.nombre)}
      </h2>
      <div class="meta">🔴 Servicio</div>
      ${duracionHTML}
      ${codigoBadge}
    </div>

    <div class="kpis">
      <div class="kbox">
        <div class="k">Precio</div>
        <div class="v" style="color:var(--green)">${fmt(c.precioVenta)}</div>
      </div>
      <div class="kbox">
        <div class="k">Costo consumibles</div>
        <div class="v">${fmt(c.costoU)}</div>
      </div>
      <div class="kbox">
        <div class="k">Ganancia neta</div>
        <div class="v">${fmt(c.gananciaNeta)}</div>
      </div>
      <div class="kbox">
        <div class="k">Vendidos</div>
        <div class="v">${c.uVend}</div>
      </div>
    </div>

    ${descHTML}

    ${consumHTML}

    <button class="btn-ghost" id="d-edit">✏️ Editar servicio</button>
    <button class="btn-ghost btn-danger" id="d-del">Eliminar servicio</button>
  `;
}

/* =========================================================
   HISTORIAL DE PRECIOS DE UN MATERIAL
   ========================================================= */
function buildHistorialPreciosMaterial(p){
  const lotes = Array.isArray(p.lotes) ? p.lotes : [];
  if(lotes.length < 2) return '';

  /* Ordenar descendente por fecha */
  const ordenados = [...lotes].sort((a, b) => a.fecha < b.fecha ? 1 : -1);

  const ui = unidadInfo(p.unidad || 'unidad');

  const filas = ordenados.map((l, i) => {
    const anterior = ordenados[i + 1];
    let flecha = '─';
    let colorFlecha = 'var(--dim)';

    if(anterior){
      if(l.costoUnitario > anterior.costoUnitario){
        flecha = '↑';
        colorFlecha = 'var(--red)';
      } else if(l.costoUnitario < anterior.costoUnitario){
        flecha = '↓';
        colorFlecha = 'var(--green)';
      }
    }

    const fecha = l.fecha ? l.fecha.split('-').reverse().slice(0,2).join('/') : '—';

    return `
      <div class="hist-precio-row">
        <span class="hist-precio-fecha">${fecha}</span>
        <span class="hist-precio-monto">${fmt(l.costoUnitario)}/${ui.abreviacion}</span>
        <span class="hist-precio-flecha" style="color:${colorFlecha}">${flecha}</span>
      </div>`;
  }).join('');

  return `
    <div class="detail-lotes">
      <div class="detail-lotes-title">📈 Historial de precios</div>
      ${filas}
    </div>`;
}

/* =========================================================
   views/detail.js — Detalle del producto
   Con termómetro bipolar + badge "Único" si no es restockeable.
   v11: fotos desde IndexedDB vía getFotosProducto()
   ========================================================= */

function openDetail(id){
  const p = window.DB.products.find(x => x.id === id);
  if(!p) return;

  const c = calc(p);
  const enRojo = c.saldo < 0;

  const body = $('#detail-body');
  if(!body) return;

  body.innerHTML = buildDetailHTML(p, c, enRojo);

  const btnRestock = $('#d-restock');
  if(btnRestock){
    btnRestock.onclick = () => {
      closeModal('#m-detail');
      openRestock(id);
    };
  }

  const btnEdit = $('#d-edit');
  if(btnEdit) btnEdit.onclick = () => {
    closeModal('#m-detail');
    openEditForm(id);
  };

  const btnDel = $('#d-del');
  if(btnDel) btnDel.onclick = () => eliminarProducto(id, p.nombre);

  openModal('#m-detail');
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

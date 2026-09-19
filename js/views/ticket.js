/* =========================================================
   views/ticket.js — Modal del ticket + exportar PNG
   v12: guarda en Documents/Stoki/Facturas/ en APK
   ========================================================= */

function openTicket(ticketId){
  const t = window.DB.tickets.find(x => x.id === ticketId);
  if(!t){ toast('⚠️ Ticket no encontrado'); return; }

  if(document.querySelector('#m-ticket')) return;

  const html = `
    <div class="overlay centered open" id="m-ticket">
      <div class="sheet" style="position:relative">
        <button class="x" id="ticket-close">✕</button>
        ${buildTicketHTML(t)}

        <button class="btn-main" id="ticket-export"
                style="margin-top:16px">
          📤 Exportar factura
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#ticket-close').addEventListener('click', closeTicket);
  document.querySelector('#ticket-export').addEventListener('click', () => {
    closeTicket();
    setTimeout(() => openTicketExport(ticketId), 200);
  });

  document.querySelector('#m-ticket').addEventListener('click', e => {
    if(e.target.id === 'm-ticket') closeTicket();
  });
}

function closeTicket(){
  const el = document.querySelector('#m-ticket');
  if(el) el.remove();
}

function buildTicketHTML(t){
  const fecha = fmtDateTime(t.fecha);
  const refTotal = fmtRefOnly(t.total, t.tasaSnapshot);

  const itemsHTML = (t.items || []).map(item => {
    const p = window.DB.products.find(x => x.id === item.productoId);
    const thumb = p ? buildThumb(p, 40) :
      '<div style="width:40px;height:40px;border-radius:10px;background:var(--bg3)"></div>';
    const subtotal = item.cantidad * item.precioUnitario;

    /* Formato de cantidad según unidad */
    let cantTxt;
    const unidad = p ? (p.unidad || 'unidad') : 'unidad';
    const t2 = p ? tipoDe(p) : 'producto';
    const esFrac = (t2 === 'producto' || t2 === 'material') && unidad !== 'unidad';

    if(esFrac){
      cantTxt = `${fmtCantidadUnidad(item.cantidad, unidad)} × ${fmt(item.precioUnitario)}/${unidadInfo(unidad).abreviacion}`;
    } else {
      cantTxt = `${item.cantidad} × ${fmt(item.precioUnitario)}`;
    }

    return `
      <div class="ticket-item">
        ${thumb}
        <div class="ticket-item-info">
          <div class="ticket-item-name">${esc(item.nombre)}</div>
          <div class="ticket-item-meta">${cantTxt}</div>
        </div>
        <div class="ticket-item-total">${fmt(subtotal)}</div>
      </div>`;
  }).join('');

  const clienteHTML = t.clienteNombre
    ? `<div class="ticket-cliente">👤 ${esc(t.clienteNombre)}</div>`
    : '';

  const efectivoHTML = t.efectivo
    ? `<div class="ticket-cliente"
            style="background:rgba(34,197,94,.14);color:var(--green)">
         💵 Pago en efectivo
       </div>`
    : '';

  const pagoMovilHTML = t.pagoMovil
    ? `<div class="ticket-cliente"
            style="background:rgba(59,130,246,.14);color:#60a5fa">
         📱 Pago Móvil
       </div>`
    : '';

  return `
    <div class="ticket-header">
      <div class="ticket-icon">🧾</div>
      <div class="ticket-number">${esc(t.numero)}</div>
      <div class="ticket-fecha">${fecha}</div>
    </div>

    ${clienteHTML}
    ${efectivoHTML}
    ${pagoMovilHTML}

    <div class="ticket-items">${itemsHTML}</div>

    <div class="ticket-total-box">
      <div class="ticket-total-line">
        <span>Total</span>
        <b>${fmt(t.total)}</b>
      </div>
      ${refTotal ? `<div class="ticket-total-ref">${refTotal}</div>` : ''}
      <div class="ticket-total-ganancia">
        Ganancia: ${t.ganancia >= 0 ? '+' : ''}${fmt(t.ganancia)}
      </div>
    </div>`;
}

async function openTicketExport(ticketId){
  const t = window.DB.tickets.find(x => x.id === ticketId);
  if(!t){ toast('⚠️ Ticket no encontrado'); return; }

  if(typeof html2canvas === 'undefined'){
    toast('⚠️ Generador no cargado. Revisá tu internet.');
    return;
  }

  const loadingHTML = `
    <div class="overlay centered open" id="m-export">
      <div class="sheet" style="position:relative;text-align:center">
        <h2>Generando factura...</h2>
        <div class="sub">Un momento</div>
        <div class="export-spinner">⏳</div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', loadingHTML);

  try{
    const canvas = await buildTicketCanvas(t);
    const dataURL = canvas.toDataURL('image/png');

    const loadEl = document.querySelector('#m-export');
    if(loadEl) loadEl.remove();

    const exportHTML = `
      <div class="overlay centered open" id="m-export">
        <div class="sheet" style="position:relative">
          <button class="x" id="export-close">✕</button>
          <h2>📤 Factura lista</h2>
          <div class="sub">Compartila o descargala</div>

          <div class="export-preview">
            <img src="${dataURL}" alt="Factura">
          </div>

          <button class="btn-main" id="export-wa">
            💬 Compartir por WhatsApp
          </button>
          <button class="btn-ghost" id="export-dl">
            ⬇️ Descargar PNG
          </button>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', exportHTML);

    document.querySelector('#export-close').addEventListener('click', closeExport);
    document.querySelector('#export-wa').addEventListener('click', () => sharePNG(dataURL, t.numero));
    document.querySelector('#export-dl').addEventListener('click', () => downloadPNG(dataURL, t.numero));

    document.querySelector('#m-export').addEventListener('click', e => {
      if(e.target.id === 'm-export') closeExport();
    });

  }catch(e){
    console.error('Error generando PNG:', e);
    const loadEl = document.querySelector('#m-export');
    if(loadEl) loadEl.remove();
    toast('⚠️ No se pudo generar la imagen');
  }
}

function closeExport(){
  const el = document.querySelector('#m-export');
  if(el) el.remove();
}

async function buildTicketCanvas(t){
  const negocio = window.DB.settings.business || {};
  const fecha = fmtDateTime(t.fecha);
  const items = t.items || [];

  const itemsHTML = items.map(item => {
    const subtotal = item.cantidad * item.precioUnitario;
    const p = window.DB.products.find(x => x.id === item.productoId);
    const unidad = p ? (p.unidad || 'unidad') : 'unidad';
    const t2 = p ? tipoDe(p) : 'producto';
    const esFrac = (t2 === 'producto' || t2 === 'material') && unidad !== 'unidad';
    const cantMostrar = esFrac
      ? fmtCantidadUnidad(item.cantidad, unidad)
      : item.cantidad;
    return `
      <tr>
        <td style="padding:8px 4px;border-bottom:1px solid #e0e0e0;
                   text-align:left;font-size:13px;color:#1a1a1a">
          ${esc(item.nombre)}
        </td>
        <td style="padding:8px 4px;border-bottom:1px solid #e0e0e0;
                   text-align:center;font-size:13px;color:#333">
          ${cantMostrar}
        </td>
        <td style="padding:8px 4px;border-bottom:1px solid #e0e0e0;
                   text-align:right;font-size:13px;color:#333">
          ${fmt(item.precioUnitario)}
        </td>
        <td style="padding:8px 4px;border-bottom:1px solid #e0e0e0;
                   text-align:right;font-size:13px;color:#1a1a1a;
                   font-weight:700">
          ${fmt(subtotal)}
        </td>
      </tr>`;
  }).join('');

  const negocioHTML = negocio.nombre
    ? `
      <div style="font-size:20px;font-weight:900;color:#0f1115;
                  letter-spacing:-.5px;margin-bottom:2px">
        ${esc(negocio.nombre)}
      </div>
      ${negocio.rif ? `<div style="font-size:11px;color:#666">RIF: ${esc(negocio.rif)}</div>` : ''}
      ${negocio.telefono ? `<div style="font-size:11px;color:#666">📞 ${esc(negocio.telefono)}</div>` : ''}
      ${negocio.direccion ? `<div style="font-size:11px;color:#666">${esc(negocio.direccion)}</div>` : ''}
    `
    : `<div style="font-size:20px;font-weight:900;color:#22c55e;
                   letter-spacing:-.5px">Stoki</div>`;

  const clienteHTML = t.clienteNombre
    ? `<div style="background:#f5f5f5;border-radius:8px;
                   padding:10px 14px;margin-bottom:14px;
                   font-size:13px;color:#1a1a1a">
         <b>Cliente:</b> ${esc(t.clienteNombre)}
       </div>`
    : '';

  const efectivoHTML = t.efectivo
    ? `<div style="background:#dcfce7;border-radius:8px;
                   padding:8px 14px;margin-bottom:14px;
                   font-size:12px;font-weight:800;color:#16a34a;
                   text-align:center">
         💵 Pago en efectivo
       </div>`
    : '';

  const pagoMovilHTML = t.pagoMovil
    ? `<div style="background:#dbeafe;border-radius:8px;
                   padding:8px 14px;margin-bottom:14px;
                   font-size:12px;font-weight:800;color:#2563eb;
                   text-align:center">
         📱 Pago Móvil
       </div>`
    : '';

  const refTotal = fmtRefOnly(t.total, t.tasaSnapshot);

  const renderHTML = `
    <div style="width:600px;padding:32px 28px;background:#ffffff;
                font-family:Roboto,Arial,sans-serif;color:#1a1a1a">

      <div style="display:flex;justify-content:space-between;
                  align-items:flex-start;padding-bottom:16px;
                  border-bottom:2px solid #22c55e;margin-bottom:20px">
        <div>${negocioHTML}</div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#999;text-transform:uppercase;
                      letter-spacing:1px;font-weight:800">Factura</div>
          <div style="font-family:Courier New,monospace;font-size:14px;
                      font-weight:900;color:#0f1115;margin-top:2px">
            ${esc(t.numero)}
          </div>
          <div style="font-size:11px;color:#666;margin-top:4px">
            ${fecha}
          </div>
        </div>
      </div>

      ${clienteHTML}
      ${efectivoHTML}
      ${pagoMovilHTML}

      <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
        <thead>
          <tr>
            <th style="padding:8px 4px;text-align:left;font-size:10px;
                       color:#999;text-transform:uppercase;
                       letter-spacing:.5px;border-bottom:2px solid #eee">
              Producto
            </th>
            <th style="padding:8px 4px;text-align:center;font-size:10px;
                       color:#999;text-transform:uppercase;
                       letter-spacing:.5px;border-bottom:2px solid #eee">
              Cant.
            </th>
            <th style="padding:8px 4px;text-align:right;font-size:10px;
                       color:#999;text-transform:uppercase;
                       letter-spacing:.5px;border-bottom:2px solid #eee">
              Precio
            </th>
            <th style="padding:8px 4px;text-align:right;font-size:10px;
                       color:#999;text-transform:uppercase;
                       letter-spacing:.5px;border-bottom:2px solid #eee">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>${itemsHTML}</tbody>
      </table>

      <div style="background:#f8f9fa;border-radius:10px;
                  padding:16px 18px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;
                    align-items:baseline">
          <span style="font-size:14px;color:#666;font-weight:700">
            Total
          </span>
          <span style="font-size:24px;color:#22c55e;
                       font-weight:900;letter-spacing:-.5px">
            ${fmt(t.total)}
          </span>
        </div>
        ${refTotal ? `
          <div style="text-align:right;font-size:12px;color:#888;
                      margin-top:2px;font-weight:700">
            ${refTotal}
          </div>
        ` : ''}
      </div>

      <div style="text-align:center;font-size:11px;color:#999;
                  padding-top:14px;border-top:1px solid #eee">
        ¡Gracias por su compra! 🎉
      </div>
    </div>`;

  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.left = '-9999px';
  holder.style.top = '0';
  holder.innerHTML = renderHTML;
  document.body.appendChild(holder);

  const target = holder.firstElementChild;
  const canvas = await html2canvas(target, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false
  });

  holder.remove();
  return canvas;
}

/* =========================================================
   COMPARTIR / DESCARGAR (v12 — usa exporter.js)
   ========================================================= */
async function sharePNG(dataURL, numero){
  const nombre = `Factura-${numero}.png`;
  const titulo = `Factura ${numero}`;

  const r = await compartirArchivo(dataURL, nombre, 'Facturas', titulo);

  if(r.ok){
    if(r.compartido) toast('✅ Abriendo opciones para compartir...');
    else toast('📁 Guardada en Documents/Stoki/Facturas/');
  } else if(!r.cancelado){
    toast('⚠️ No se pudo compartir la factura');
  }
}

async function downloadPNG(dataURL, numero){
  const nombre = `Factura-${numero}.png`;
  const r = await guardarArchivo(dataURL, nombre, 'Facturas');

  if(r.ok){
    if(typeof tieneCapacitor === 'function' && tieneCapacitor()){
      toast('📁 Guardada en Documents/Stoki/Facturas/');
    } else {
      toast('⬇️ Factura descargada');
    }
  } else {
    toast('⚠️ No se pudo guardar');
  }
}

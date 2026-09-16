/* =========================================================
   views/orders-export.js — Tanda C
   Compartir factura del pedido como PNG
   Reutiliza sharePNG y downloadPNG de ticket.js
   ========================================================= */

async function compartirFacturaPedidoPNG(pedidoId){
  const o = (window.DB.orders || []).find(x => x.id === pedidoId);
  if(!o){ toast('⚠️ Pedido no encontrado'); return; }

  if(typeof html2canvas === 'undefined'){
    toast('⚠️ Generador no cargado. Revisá tu internet.');
    return;
  }

  if(document.querySelector('#m-ped-export')) return;

  /* Modal de carga */
  const loadingHTML = `
    <div class="overlay centered open" id="m-ped-export">
      <div class="sheet" style="position:relative;text-align:center;max-width:380px">
        <h2>Generando factura...</h2>
        <div class="sub">Un momento</div>
        <div style="font-size:48px;margin-top:10px">⏳</div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', loadingHTML);

  try{
    const canvas = await buildPedidoCanvas(o);
    const dataURL = canvas.toDataURL('image/png');

    const loadEl = document.querySelector('#m-ped-export');
    if(loadEl) loadEl.remove();

    /* Modal de preview */
    const exportHTML = `
      <div class="overlay centered open" id="m-ped-export">
        <div class="sheet" style="position:relative">
          <button class="x" id="pedexp-close">✕</button>
          <h2>📤 Factura lista</h2>
          <div class="sub">Compartila o descargala</div>

          <div class="export-preview">
            <img src="${dataURL}" alt="Factura">
          </div>

          <button class="btn-whatsapp" id="pedexp-wa">
            💬 Compartir por WhatsApp
          </button>
          <button class="btn-ghost" id="pedexp-dl">
            ⬇️ Descargar PNG
          </button>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', exportHTML);

    document.querySelector('#pedexp-close').addEventListener('click', closePedidoExport);
    document.querySelector('#pedexp-wa').addEventListener('click', () => sharePNG(dataURL, o.numero));
    document.querySelector('#pedexp-dl').addEventListener('click', () => downloadPNG(dataURL, o.numero));

    document.querySelector('#m-ped-export').addEventListener('click', e => {
      if(e.target.id === 'm-ped-export') closePedidoExport();
    });

  }catch(e){
    console.error('Error generando PNG del pedido:', e);
    const loadEl = document.querySelector('#m-ped-export');
    if(loadEl) loadEl.remove();
    toast('⚠️ No se pudo generar la imagen');
  }
}

function closePedidoExport(){
  const el = document.querySelector('#m-ped-export');
  if(el) el.remove();
}

/* =========================================================
   GENERADOR DEL CANVAS
   ========================================================= */
async function buildPedidoCanvas(o){
  const negocio = window.DB.settings.business || {};
  const cliente = (window.DB.clients || []).find(c => c.id === o.clienteId);
  const clienteNombre = cliente ? cliente.nombre : (o.clienteNombre || 'Sin cliente');
  const clienteTel = cliente ? (cliente.telefono || '') : '';
  const fecha = fmtDateTime(o.fecha);
  const items = o.items || [];

  /* Filas de items */
  const itemsHTML = items.map(item => {
    const subtotal = item.cantidad * item.precioUnitario;
    return `
      <tr>
        <td style="padding:8px 4px;border-bottom:1px solid #e0e0e0;
                   text-align:left;font-size:13px;color:#1a1a1a">
          ${esc(item.nombre)}
        </td>
        <td style="padding:8px 4px;border-bottom:1px solid #e0e0e0;
                   text-align:center;font-size:13px;color:#333">
          ${item.cantidad}
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

  /* Bloque del negocio */
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

  /* Bloque del cliente */
  const clienteHTML = `
    <div style="background:#f5f5f5;border-radius:8px;padding:12px 14px;
                margin-bottom:14px;font-size:13px;color:#1a1a1a">
      <div><b>Cliente:</b> ${esc(clienteNombre)}</div>
      ${clienteTel ? `<div style="font-size:11px;color:#666;margin-top:2px">
                        📞 ${esc(clienteTel)}
                      </div>` : ''}
    </div>`;

  /* Los 3 checks como badges */
  const checkBadge = (label, done, icon) => `
    <td style="padding:10px;text-align:center;border-radius:8px;
               background:${done ? '#dcfce7' : '#f5f5f5'};
               color:${done ? '#16a34a' : '#999'};
               font-size:11px;font-weight:800;width:33%">
      <div style="font-size:18px;margin-bottom:2px">${done ? '✓' : icon}</div>
      ${label}
    </td>`;

  const checksHTML = `
    <table style="width:100%;border-collapse:separate;
                  border-spacing:8px 0;margin-bottom:16px">
      <tr>
        ${checkBadge('Pagado', o.pagado, '💵')}
        ${checkBadge('Enviado', o.enviado, '🚚')}
        ${checkBadge('Entregado', o.entregado, '📬')}
      </tr>
    </table>`;

  /* Estado del pedido */
  const estadoLabel = o.estado === 'cerrado' ? '✅ Pedido cerrado'
                    : o.estado === 'cancelado' ? '🚫 Pedido cancelado'
                    : '🔴 Pedido activo';

  /* Ref de tasa */
  const refTotal = fmtRefOnly(o.total, o.tasaSnapshot);

  /* HTML para el render */
  const renderHTML = `
    <div style="width:600px;padding:32px 28px;background:#ffffff;
                font-family:Roboto,Arial,sans-serif;color:#1a1a1a">

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;
                  align-items:flex-start;padding-bottom:16px;
                  border-bottom:2px solid #22c55e;margin-bottom:20px">
        <div>${negocioHTML}</div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#999;text-transform:uppercase;
                      letter-spacing:1px;font-weight:800">Pedido</div>
          <div style="font-family:Courier New,monospace;font-size:14px;
                      font-weight:900;color:#0f1115;margin-top:2px">
            ${esc(o.numero)}
          </div>
          <div style="font-size:11px;color:#666;margin-top:4px">${fecha}</div>
        </div>
      </div>

      ${clienteHTML}

      <!-- Items -->
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

      <!-- Total -->
      <div style="background:#f8f9fa;border-radius:10px;
                  padding:16px 18px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;
                    align-items:baseline">
          <span style="font-size:14px;color:#666;font-weight:700">Total</span>
          <span style="font-size:24px;color:#22c55e;
                       font-weight:900;letter-spacing:-.5px">
            ${fmt(o.total)}
          </span>
        </div>
        ${refTotal ? `
          <div style="text-align:right;font-size:12px;color:#888;
                      margin-top:2px;font-weight:700">
            ${refTotal}
          </div>
        ` : ''}
      </div>

      <!-- Estado + Checks -->
      <div style="font-size:10px;color:#999;text-transform:uppercase;
                  letter-spacing:1px;font-weight:800;margin-bottom:8px">
        Estado del pedido
      </div>
      ${checksHTML}

      <div style="text-align:center;font-size:12px;font-weight:800;
                  color:#666;padding:10px;background:#f8f9fa;
                  border-radius:8px;margin-bottom:16px">
        ${estadoLabel}
      </div>

      <!-- Footer -->
      <div style="text-align:center;font-size:11px;color:#999;
                  padding-top:14px;border-top:1px solid #eee">
        ¡Gracias por su compra! 🎉
      </div>
    </div>`;

  /* Render temporal fuera de pantalla */
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


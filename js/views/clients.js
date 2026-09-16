/* =========================================================
   views/clients.js — Pestaña Clientes
   ========================================================= */

let cliBusqueda = '';

function renderClients(){
  const cont = document.querySelector('#v-clients');
  if(!cont) return;

  const clientes = window.DB.clients || [];
  const toolbar = buildClientsToolbar();

  if(!clientes.length){
    cont.innerHTML = toolbar + `
      <div class="empty">
        <div class="ico">👥</div>
        <h3>Sin clientes</h3>
        <p>Al confirmar una venta podés guardar<br>los datos del cliente.</p>
      </div>`;
    bindClientsEvents();
    return;
  }

  const filtrados = filterClients();

  if(!filtrados.length){
    cont.innerHTML = toolbar + `
      <div class="empty">
        <div class="ico">🔍</div>
        <h3>Sin resultados</h3>
        <p>Ningún cliente coincide con "${esc(cliBusqueda)}"</p>
      </div>`;
    bindClientsEvents();
    return;
  }

  filtrados.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity:'base' })
  );

  cont.innerHTML = toolbar + `
    <div class="cli-list">
      ${filtrados.map(buildClientRow).join('')}
    </div>`;

  bindClientsEvents();
}

function buildClientsToolbar(){
  const filtrados = filterClients().length;

  const contador = cliBusqueda
    ? `<div class="inv-counter">${filtrados} resultado${filtrados !== 1 ? 's' : ''}</div>`
    : '';

  return `
    <div class="inv-toolbar">
      <div class="inv-search">
        <input type="text"
               id="cli-search"
               placeholder="Buscar por nombre, cédula o teléfono..."
               autocomplete="off"
               value="${esc(cliBusqueda)}"
               style="padding-right:40px">
        ${cliBusqueda ? '<button class="inv-search-clear" id="cli-search-clear">✕</button>' : ''}
      </div>
      ${contador}
    </div>`;
}

function filterClients(){
  const q = normalize(cliBusqueda);
  const clientes = window.DB.clients || [];

  if(!q) return [...clientes];

  return clientes.filter(c =>
    normalize(c.nombre).includes(q) ||
    normalize(c.cedula || '').includes(q) ||
    normalize(c.telefono || '').includes(q)
  );
}

function buildClientRow(c){
  const tickets = (window.DB.tickets || []).filter(t => t.clienteId === c.id);
  const totalGastado = tickets.reduce((s, t) => s + t.total, 0);
  const compras = tickets.length;
  const inicial = esc((c.nombre || '?').charAt(0).toUpperCase());

  const meta = [];
  if(c.cedula) meta.push(esc(c.cedula));
  if(c.telefono) meta.push(esc(c.telefono));

  return `
    <div class="cli-row" data-cli="${c.id}">
      <div class="cli-avatar">${inicial}</div>
      <div class="cli-info">
        <div class="cli-nombre">${esc(c.nombre)}</div>
        ${meta.length ? `<div class="cli-meta">${meta.join(' · ')}</div>` : ''}
        <div class="cli-stats">
          ${compras} compra${compras !== 1 ? 's' : ''} · ${fmt(totalGastado)}
        </div>
      </div>
      <div class="cli-chevron">›</div>
    </div>`;
}

function bindClientsEvents(){
  const input = document.querySelector('#cli-search');
  if(input){
    input.addEventListener('input', e => {
      cliBusqueda = e.target.value;
      renderClients();
      const nuevo = document.querySelector('#cli-search');
      if(nuevo){
        nuevo.focus();
        nuevo.setSelectionRange(cliBusqueda.length, cliBusqueda.length);
      }
    });
  }

  const clear = document.querySelector('#cli-search-clear');
  if(clear){
    clear.addEventListener('click', e => {
      e.stopPropagation();
      cliBusqueda = '';
      renderClients();
    });
  }

  document.querySelectorAll('.cli-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.cli;
      if(id) openClientDetail(id);
    });
  });
}

function openClientDetail(clienteId){
  const c = (window.DB.clients || []).find(x => x.id === clienteId);
  if(!c){ toast('⚠️ Cliente no encontrado'); return; }

  if(document.querySelector('#m-client')) return;

  const tickets = (window.DB.tickets || [])
    .filter(t => t.clienteId === c.id)
    .sort((a, b) => a.fecha < b.fecha ? 1 : -1);

  const totalGastado = tickets.reduce((s, t) => s + t.total, 0);

  const ticketsHTML = tickets.length
    ? tickets.map(t => {
        const fecha = fmtDateTime(t.fecha);
        const items = t.items || [];
        const resumen = items.length === 1
          ? esc(items[0].nombre)
          : `${esc(items[0].nombre)} +${items.length - 1}`;

        return `
          <div class="cli-ticket" data-ticket="${t.id}">
            <div class="cli-ticket-head">
              <span class="cli-ticket-num">${esc(t.numero)}</span>
              <span class="cli-ticket-fecha">${fecha}</span>
            </div>
            <div class="cli-ticket-body">
              <div class="cli-ticket-resumen">${resumen}</div>
              <div class="cli-ticket-monto">${fmt(t.total)}</div>
            </div>
          </div>`;
      }).join('')
    : `<div class="empty" style="padding:30px 10px">
         <div class="ico">🧾</div>
         <h3>Sin facturas</h3>
         <p>Este cliente todavía no tiene compras.</p>
       </div>`;

  const html = `
    <div class="overlay centered open" id="m-client">
      <div class="sheet" style="position:relative">
        <button class="x" id="cli-close">✕</button>

        <div class="cli-detail-header">
          <div class="cli-avatar" style="width:64px;height:64px;font-size:26px">
            ${esc((c.nombre || '?').charAt(0).toUpperCase())}
          </div>
          <h2 style="margin:12px 0 6px;text-align:center">${esc(c.nombre)}</h2>
          ${c.cedula ? `<div class="cli-detail-meta">📄 ${esc(c.cedula)}</div>` : ''}
          ${c.telefono ? `<div class="cli-detail-meta">📞 ${esc(c.telefono)}</div>` : ''}
        </div>

        <div class="cli-detail-kpis">
          <div class="kbox">
            <div class="k">Compras</div>
            <div class="v">${tickets.length}</div>
          </div>
          <div class="kbox">
            <div class="k">Total gastado</div>
            <div class="v">${fmt(totalGastado)}</div>
          </div>
        </div>

        <div class="cli-tickets-title">🧾 Facturas</div>
        <div class="cli-tickets">${ticketsHTML}</div>

        <button class="btn-ghost" id="cli-edit">✏️ Editar cliente</button>
        <button class="btn-ghost btn-danger" id="cli-del">Eliminar cliente</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#cli-close').addEventListener('click', closeClientDetail);
  document.querySelector('#m-client').addEventListener('click', e => {
    if(e.target.id === 'm-client') closeClientDetail();
  });

  document.querySelector('#cli-edit').addEventListener('click', () => {
    closeClientDetail();
    setTimeout(() => openClientEdit(clienteId), 200);
  });

  document.querySelector('#cli-del').addEventListener('click', () => {
    deleteClient(clienteId, c.nombre);
  });

  document.querySelectorAll('.cli-ticket').forEach(row => {
    row.addEventListener('click', () => {
      const tid = row.dataset.ticket;
      if(tid && typeof openTicket === 'function'){
        closeClientDetail();
        setTimeout(() => openTicket(tid), 200);
      }
    });
  });
}
function closeClientDetail(){
  const el = document.querySelector('#m-client');
  if(el) el.remove();
}

function openClientEdit(clienteId){
  const c = (window.DB.clients || []).find(x => x.id === clienteId);
  if(!c) return;

  if(document.querySelector('#m-client-edit')) return;

  const html = `
    <div class="overlay centered open" id="m-client-edit">
      <div class="sheet" style="position:relative">
        <button class="x" id="cle-close">✕</button>
        <h2>✏️ Editar cliente</h2>
        <div class="sub">Modificá los datos de contacto.</div>

        <label>Nombre</label>
        <input id="cle-nombre" value="${esc(c.nombre)}">

        <label>Cédula / ID</label>
        <input id="cle-cedula" value="${esc(c.cedula || '')}"
               placeholder="Ej: V-12345678">

        <label>Teléfono</label>
        <input id="cle-telefono" type="tel" value="${esc(c.telefono || '')}"
               placeholder="Ej: 0412-1234567">

        <label>Notas</label>
        <input id="cle-notas" value="${esc(c.notas || '')}"
               placeholder="Cliente frecuente...">

        <button class="btn-main" id="cle-save">Guardar cambios</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#cle-close').addEventListener('click', () => {
    document.querySelector('#m-client-edit').remove();
  });

  document.querySelector('#cle-save').addEventListener('click', () => {
    const nombre = document.querySelector('#cle-nombre').value.trim();
    if(!nombre) return toast('⚠️ El nombre es obligatorio');

    c.nombre = nombre;
    c.cedula = document.querySelector('#cle-cedula').value.trim();
    c.telefono = document.querySelector('#cle-telefono').value.trim();
    c.notas = document.querySelector('#cle-notas').value.trim();

    saveDB();

    document.querySelector('#m-client-edit').remove();
    renderClients();
    toast('✅ Cliente actualizado');
  });
}

async function deleteClient(clienteId, nombre){
  const tickets = (window.DB.tickets || []).filter(t => t.clienteId === clienteId);

  const mensaje = tickets.length
    ? `Tiene ${tickets.length} factura${tickets.length !== 1 ? 's' : ''} asociada${tickets.length !== 1 ? 's' : ''}.\nLas facturas NO se borran, solo pierden el cliente.`
    : 'Esta acción no se puede deshacer.';

  const ok = await confirmarAccion({
    titulo: `¿Eliminar a "${nombre}"?`,
    mensaje,
    botonOk: 'Eliminar',
    botonCancel: 'Cancelar',
    colorOk: 'rojo'
  });

  if(!ok) return;

  window.DB.clients = (window.DB.clients || []).filter(c => c.id !== clienteId);
  saveDB();

  closeClientDetail();
  renderClients();
  toast('🗑️ Cliente eliminado');
}
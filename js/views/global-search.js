/* =========================================================
   views/global-search.js — Búsqueda global
   ========================================================= */

function abrirBusquedaGlobal(){
  if(document.querySelector('#m-busqueda-global')) return;

  const html = `
    <div class="overlay centered open gs-modal" id="m-busqueda-global">
      <div class="sheet" style="position:relative">
        <button class="x" id="gs-close">✕</button>
        <h2>🔍 Buscar</h2>
        <div class="sub">Productos, clientes, pedidos y más</div>

        <div class="gs-search-box">
          <span class="gs-search-icon">🔍</span>
          <input type="text" id="gs-input"
                 placeholder="Nombre, cédula, código..."
                 autocomplete="off">
          <button class="gs-search-clear" id="gs-clear" style="display:none">✕</button>
        </div>

        <div class="gs-resultados" id="gs-resultados">
          <div class="gs-hint">
            Escribí algo para buscar en:<br>
            📦 Productos · 👥 Clientes · 🏭 Proveedores<br>
            📋 Pedidos · 🧾 Facturas
          </div>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const input = document.querySelector('#gs-input');
  const clear = document.querySelector('#gs-clear');

  setTimeout(() => input.focus(), 250);

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clear.style.display = q ? 'flex' : 'none';
    if(q.length < 2){
      document.querySelector('#gs-resultados').innerHTML = `
        <div class="gs-hint">Escribí al menos 2 letras para buscar.</div>`;
      return;
    }
    renderResultadosBusqueda(q);
  });

  clear.addEventListener('click', () => {
    input.value = '';
    clear.style.display = 'none';
    input.focus();
    document.querySelector('#gs-resultados').innerHTML = `
      <div class="gs-hint">Escribí algo para buscar.</div>`;
  });

  document.querySelector('#gs-close').addEventListener('click', cerrarBusquedaGlobal);
  document.querySelector('#m-busqueda-global').addEventListener('click', e => {
    if(e.target.id === 'm-busqueda-global') cerrarBusquedaGlobal();
  });
}

function cerrarBusquedaGlobal(){
  const el = document.querySelector('#m-busqueda-global');
  if(el) el.remove();
}

function renderResultadosBusqueda(q){
  const cont = document.querySelector('#gs-resultados');
  if(!cont) return;

  const nq = normalize(q);

  const grupos = [];

  /* --- Productos --- */
  const productos = (window.DB.products || []).filter(p =>
    normalize(p.nombre).includes(nq) ||
    normalize(p.codigoBarras || '').includes(nq)
  ).slice(0, 8);

  if(productos.length){
    grupos.push({
      titulo: `📦 Productos (${productos.length})`,
      items: productos.map(p => {
        const c = calc(p);
        const foto = getFotoPrincipal(p);
        const iconHTML = foto
          ? `<div class="gs-item-icon foto" style="background-image:url('${foto}')"></div>`
          : `<div class="gs-item-icon">${esc((p.nombre || '?').charAt(0).toUpperCase())}</div>`;

        const ti = tipoInfo(p);
        const t = tipoDe(p);
        const unidad = p.unidad || 'unidad';
        const stockTxt = c.stock === Infinity ? '∞' : fmtCantidadUnidad(c.stock, unidad);
        const precioTxt = t === 'servicio'
          ? fmt(c.precioVenta)
          : (c.stockDisponible !== undefined
              ? `Alcanza para ${c.stockDisponible} · ${fmt(c.precioVenta)}`
              : `${stockTxt} · ${fmt(c.precioVenta)}`);

        return `
          <div class="gs-item" data-tipo="producto" data-id="${p.id}">
            ${iconHTML}
            <div class="gs-item-info">
              <div class="gs-item-nombre">${ti.emoji} ${esc(p.nombre)}</div>
              <div class="gs-item-meta">${precioTxt}</div>
            </div>
          </div>`;
      })
    });
  }

  /* --- Clientes --- */
  const clientes = (window.DB.clients || []).filter(c =>
    normalize(c.nombre).includes(nq) ||
    normalize(c.cedula || '').includes(nq) ||
    normalize(c.telefono || '').includes(nq)
  ).slice(0, 8);

  if(clientes.length){
    grupos.push({
      titulo: `👥 Clientes (${clientes.length})`,
      items: clientes.map(c => {
        const inicial = esc((c.nombre || '?').charAt(0).toUpperCase());
        const meta = [];
        if(c.cedula) meta.push(esc(c.cedula));
        if(c.telefono) meta.push(esc(c.telefono));
        return `
          <div class="gs-item" data-tipo="cliente" data-id="${c.id}">
            <div class="gs-item-icon">${inicial}</div>
            <div class="gs-item-info">
              <div class="gs-item-nombre">${esc(c.nombre)}</div>
              <div class="gs-item-meta">${meta.join(' · ') || 'Sin datos'}</div>
            </div>
          </div>`;
      })
    });
  }

  /* --- Proveedores --- */
  const proveedores = (window.DB.suppliers || []).filter(s =>
    normalize(s.nombre).includes(nq) ||
    normalize(s.tienda || '').includes(nq) ||
    normalize(s.telefono || '').includes(nq)
  ).slice(0, 8);

  if(proveedores.length){
    grupos.push({
      titulo: `🏭 Proveedores (${proveedores.length})`,
      items: proveedores.map(s => {
        const inicial = esc((s.nombre || '?').charAt(0).toUpperCase());
        const meta = [];
        if(s.tienda) meta.push(esc(s.tienda));
        if(s.telefono) meta.push(esc(s.telefono));
        return `
          <div class="gs-item" data-tipo="proveedor" data-id="${s.id}">
            <div class="gs-item-icon">${inicial}</div>
            <div class="gs-item-info">
              <div class="gs-item-nombre">${esc(s.nombre)}</div>
              <div class="gs-item-meta">${meta.join(' · ') || 'Sin datos'}</div>
            </div>
          </div>`;
      })
    });
  }

  /* --- Pedidos --- */
  const pedidos = (window.DB.orders || []).filter(o =>
    normalize(o.numero).includes(nq) ||
    normalize(o.clienteNombre || '').includes(nq)
  ).slice(0, 8);

  if(pedidos.length){
    grupos.push({
      titulo: `📋 Pedidos (${pedidos.length})`,
      items: pedidos.map(o => `
        <div class="gs-item" data-tipo="pedido" data-id="${o.id}">
          <div class="gs-item-icon">📋</div>
          <div class="gs-item-info">
            <div class="gs-item-nombre">${esc(o.numero)}</div>
            <div class="gs-item-meta">${esc(o.clienteNombre || 'Sin cliente')} · ${fmt(o.total)}</div>
          </div>
        </div>`)
    });
  }

  /* --- Tickets --- */
  const tickets = (window.DB.tickets || []).filter(t =>
    normalize(t.numero).includes(nq) ||
    normalize(t.clienteNombre || '').includes(nq)
  ).slice(0, 8);

  if(tickets.length){
    grupos.push({
      titulo: `🧾 Facturas (${tickets.length})`,
      items: tickets.map(t => `
        <div class="gs-item" data-tipo="ticket" data-id="${t.id}">
          <div class="gs-item-icon">🧾</div>
          <div class="gs-item-info">
            <div class="gs-item-nombre">${esc(t.numero)}</div>
            <div class="gs-item-meta">${esc(t.clienteNombre || 'Sin cliente')} · ${fmt(t.total)}</div>
          </div>
        </div>`)
    });
  }

  if(!grupos.length){
    cont.innerHTML = `
      <div class="gs-vacio">
        <div class="ico">🔍</div>
        <h3>Sin resultados</h3>
        <p>No se encontró nada para "${esc(q)}"</p>
      </div>`;
    return;
  }

  cont.innerHTML = grupos.map(g => `
    <div class="gs-grupo">
      <div class="gs-grupo-title">${g.titulo}</div>
      ${g.items.join('')}
    </div>
  `).join('');

  /* Bind de resultados */
  cont.querySelectorAll('.gs-item').forEach(item => {
    item.addEventListener('click', () => {
      const tipo = item.dataset.tipo;
      const id = item.dataset.id;
      cerrarBusquedaGlobal();
      setTimeout(() => abrirResultadoGlobal(tipo, id), 200);
    });
  });
}

function abrirResultadoGlobal(tipo, id){
  switch(tipo){
    case 'producto':
      if(typeof openDetail === 'function') openDetail(id);
      break;
    case 'cliente':
      if(typeof openClientDetail === 'function') openClientDetail(id);
      break;
    case 'proveedor':
      if(typeof openSupplierDetail === 'function') openSupplierDetail(id);
      break;
    case 'pedido':
      if(typeof openOrderDetail === 'function') openOrderDetail(id);
      break;
    case 'ticket':
      if(typeof openTicket === 'function') openTicket(id);
      break;
  }
}

function initBusquedaGlobal(){
  const btn = document.querySelector('#btn-buscar-global');
  if(btn){
    btn.addEventListener('click', abrirBusquedaGlobal);
  }
}

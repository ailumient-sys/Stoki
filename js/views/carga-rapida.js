/* carga-rapida.js — Carga tabular de productos */

let _crLineas = [];
let _crTipo = 'producto';
let _crCatId = null;

function abrirCargaRapida(catId){
  if(document.querySelector('#m-carga-rapida')) return;

  _crLineas = [];
  _crTipo = 'producto';
  _crCatId = catId || null;

  const h = `
    <div class="overlay open" id="m-carga-rapida">
      <div class="sheet" style="position:relative">
        <div class="sheet-handle"></div>
        <button class="x" id="cr-close">✕</button>
        <h2>⚡ Carga rápida</h2>
        <div class="sub">Pegá nombres (uno por línea) y generá las filas.</div>

        <label>Tipo</label>
        <div class="seg seg-2" id="cr-tipo">
          <button class="active" data-tipo="producto" type="button">🟢 Producto</button>
          <button data-tipo="material" type="button">🔵 Material</button>
        </div>

        <label>Categoría <span style="color:var(--dim);text-transform:none;font-weight:600">(opcional)</span></label>
        <button type="button" class="cat-display-btn" id="cr-cat-display">
          <span>🏷️</span>
          <span class="cat-display-text" id="cr-cat-text">Sin categoría</span>
          <span>▾</span>
        </button>

        <label>Nombres (uno por línea)</label>
        <textarea id="cr-textarea" rows="6" placeholder="Agua&#10;Refresco&#10;Bombón&#10;Cerveza"></textarea>

        <button class="btn-main" id="cr-generar">📋 Generar filas</button>

        <div id="cr-zona-filas"></div>

        <button class="btn-main" id="cr-guardar" style="display:none">
          ✅ Crear productos
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', h);

  document.getElementById('ocrFab')?.classList.add('activo');

  const fab = document.getElementById('ocrFab');
  if(fab){
    fab.onclick = () => {
      if(typeof OcrCamara === 'undefined') return toast('⚠️ OCR no disponible');
      OcrCamara.abrir((fotoDataUrl, nombre) => {
        _crLineas.push({
          id: 'crl_' + Math.random().toString(36).slice(2, 8),
          nombre: nombre || '',
          costoTotal: '',
          unidades: '1',
          precio: '',
          codigo: '',
          _fotoDataUrl: fotoDataUrl
        });
        document.querySelector('#cr-zona-filas').style.display = 'block';
        document.querySelector('#cr-guardar').style.display = 'block';
        renderCrFilas();
        if(!nombre){
          setTimeout(() => {
            const inputs = document.querySelectorAll('#cr-zona-filas .cr-nombre');
            const ultimo = inputs[inputs.length - 1];
            if(ultimo) ultimo.focus();
          }, 120);
        }
      });
    };
  }

  /* Bind: cerrar */
  const cerrar = () => {
    document.querySelector('#m-carga-rapida')?.remove();
    document.getElementById('ocrFab')?.classList.remove('activo');
  };
  document.querySelector('#cr-close').onclick = cerrar;
  document.querySelector('#m-carga-rapida').onclick = e => {
    if(e.target.id === 'm-carga-rapida') cerrar();
  };

  /* Bind: tipo */
  document.querySelectorAll('#cr-tipo button').forEach(btn => {
    btn.onclick = () => {
      _crTipo = btn.dataset.tipo;
      document.querySelectorAll('#cr-tipo button').forEach(b =>
        b.classList.toggle('active', b === btn)
      );
      renderCrFilas();
    };
  });

  /* Bind: categoría */
  document.querySelector('#cr-cat-display').onclick = () => {
    abrirSelectorCategoria(id => {
      _crCatId = id;
      actualizarCrCat();
    });
  };

  /* Bind: generar filas */
  document.querySelector('#cr-generar').onclick = generarFilas;

  /* Bind: guardar */
  document.querySelector('#cr-guardar').onclick = guardarCargaRapida;

  setTimeout(() => {
    const ta = document.querySelector('#cr-textarea');
    if(ta) ta.focus();
  }, 200);
}

function actualizarCrCat(){
  const t = document.querySelector('#cr-cat-text');
  if(!t) return;
  if(!_crCatId){
    t.textContent = 'Sin categoría';
    t.classList.remove('asignada');
    return;
  }
  const c = buscarCategoria(_crCatId);
  t.textContent = c ? c.nombre : 'Sin categoría';
  t.classList.toggle('asignada', !!c);
}

/* ═══════════════════════════════════════════
   GENERAR FILAS desde el textarea
   ═══════════════════════════════════════════ */
function generarFilas(){
  const ta = document.querySelector('#cr-textarea');
  if(!ta) return;

  const texto = ta.value.trim();
  if(!texto) return toast('⚠️ Pegá al menos un nombre');

  const nombres = texto.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if(!nombres.length) return toast('⚠️ No hay nombres válidos');

  /* Detectar duplicados en la lista */
  const vistos = new Set();
  let duplicados = 0;

  _crLineas = [];

  nombres.forEach(nombre => {
    const key = nombre.toLowerCase();
    if(vistos.has(key)){
      duplicados++;
      return;
    }
    vistos.add(key);

    _crLineas.push({
      id: 'crl_' + Math.random().toString(36).slice(2, 8),
      nombre,
      costoTotal: '',
      unidades: '1',
      precio: '',
      codigo: '',
      _fotoDataUrl: null
    });
  });

  if(duplicados > 0){
    toast(`⚠️ ${duplicados} repetido${duplicados !== 1 ? 's' : ''} ignorado${duplicados !== 1 ? 's' : ''}`);
  }

  /* Mostrar zona de filas y botón guardar */
  document.querySelector('#cr-zona-filas').style.display = 'block';
  document.querySelector('#cr-guardar').style.display = 'block';

  renderCrFilas();
}

/* ═══════════════════════════════════════════
   RENDER DE LAS FILAS
   ═══════════════════════════════════════════ */
function renderCrFilas(){
  const cont = document.querySelector('#cr-zona-filas');
  if(!cont) return;

  if(!_crLineas.length){
    cont.innerHTML = '';
    return;
  }

  const esMaterial = _crTipo === 'material';
  const lblCosto = 'Costo total';
  const lblUnid = esMaterial ? 'Cantidad' : 'Unidades';
  const lblPrecio = 'Precio venta';
  const phUnid = esMaterial ? '500' : '10';

  const filas = _crLineas.map((l, idx) => `
    <div class="cr-fila" data-id="${l.id}">
      <div class="cr-fila-head">
        ${l._fotoDataUrl ? `<div class="cr-thumb" style="background-image:url('${l._fotoDataUrl}')"></div>` : `<span class="cr-fila-num">${idx + 1}</span>`}
        <input class="cr-input cr-nombre" data-idx="${idx}" data-field="nombre"
               value="${esc(l.nombre)}" placeholder="Nombre" autocomplete="off">
        <button class="cr-del" data-del="${idx}" type="button" title="Eliminar">🗑️</button>
      </div>
      <div class="cr-fila-campos">
        <div class="cr-campo">
          <label class="cr-label">${lblCosto}</label>
          <input class="cr-input" type="number" inputmode="decimal" step="0.01" min="0"
                 data-idx="${idx}" data-field="costoTotal"
                 value="${l.costoTotal}" placeholder="0">
        </div>
        <div class="cr-campo">
          <label class="cr-label">${lblUnid}</label>
          <input class="cr-input" type="number" inputmode="decimal" step="0.01" min="0"
                 data-idx="${idx}" data-field="unidades"
                 value="${l.unidades}" placeholder="${phUnid}">
        </div>
        <div class="cr-campo">
          <label class="cr-label">${lblPrecio}</label>
          <input class="cr-input" type="number" inputmode="decimal" step="0.01" min="0"
                 data-idx="${idx}" data-field="precio"
                 value="${l.precio}" placeholder="0">
        </div>
      </div>
    </div>
  `).join('');

  cont.innerHTML = `
    <div class="cr-titulo">Productos a cargar (${_crLineas.length})</div>
    ${filas}
    <button class="btn-ghost" id="cr-add-linea" style="margin-top:6px">
      ➕ Agregar línea manual
    </button>
  `;

  bindCrFilas();
}

/* ═══════════════════════════════════════════
   BIND DE LAS FILAS
   ═══════════════════════════════════════════ */
function bindCrFilas(){
  /* Inputs de texto y número */
  document.querySelectorAll('#cr-zona-filas .cr-input').forEach(inp => {
    inp.oninput = () => {
      const idx = +inp.dataset.idx;
      const field = inp.dataset.field;
      if(_crLineas[idx]){
        _crLineas[idx][field] = inp.value;
      }
    };
  });

  /* Eliminar fila */
  document.querySelectorAll('#cr-zona-filas .cr-del').forEach(btn => {
    btn.onclick = () => {
      const idx = +btn.dataset.del;
      _crLineas.splice(idx, 1);
      renderCrFilas();
      if(navigator.vibrate) navigator.vibrate(15);
    };
  });

  /* Agregar línea manual */
  const btnAdd = document.querySelector('#cr-add-linea');
  if(btnAdd){
    btnAdd.onclick = () => {
      _crLineas.push({
        id: 'crl_' + Math.random().toString(36).slice(2, 8),
        nombre: '',
        costoTotal: '',
        unidades: '1',
        precio: '',
        codigo: '',
        _fotoDataUrl: null
      });
      renderCrFilas();
      /* Foco en el nuevo */
      setTimeout(() => {
        const inputs = document.querySelectorAll('#cr-zona-filas .cr-nombre');
        const ultimo = inputs[inputs.length - 1];
        if(ultimo) ultimo.focus();
      }, 100);
    };
  }
}

/* ═══════════════════════════════════════════
   GUARDAR LOS PRODUCTOS
   ═══════════════════════════════════════════ */
function guardarCargaRapida(){
  if(!_crLineas.length) return toast('⚠️ No hay productos para crear');

  /* Validar: al menos nombre en cada fila */
  const validas = _crLineas.filter(l => l.nombre.trim().length > 0);
  if(!validas.length) return toast('⚠️ Poné al menos un nombre');

  /* Contar sin datos completos */
  let incompletos = 0;
  validas.forEach(l => {
    const costo = parseFloat(l.costoTotal) || 0;
    const unidades = parseFloat(l.unidades) || 0;
    const precio = parseFloat(l.precio) || 0;
    if(costo === 0 || unidades === 0 || precio === 0) incompletos++;
  });

  const tipoTxt = _crTipo === 'material' ? 'materiales' : 'productos';

  /* Confirmar si hay incompletos */
  const mensaje = incompletos > 0
    ? `Se crearán ${validas.length} ${tipoTxt}.\n\n⚠️ ${incompletos} sin datos completos (se marcarán con ⚠️).\n\nPodés editarlos después.`
    : `Se crearán ${validas.length} ${tipoTxt}.`;

  confirmarAccion({
    titulo: 'Confirmar carga rápida',
    mensaje,
    botonOk: 'Crear',
    botonCancel: 'Cancelar',
    colorOk: 'verde'
  }).then(ok => {
    if(!ok) return;
    crearProductosDesdeLineas(validas);
  });
}

async function crearProductosDesdeLineas(lineas){
  let creados = 0;
  let saltados = 0;

  for(const linea of lineas){
    const nombre = linea.nombre.trim();
    if(!nombre) continue;

    /* Verificar duplicado por nombre */
    const dup = (window.DB.products || []).find(p =>
      p.nombre.toLowerCase() === nombre.toLowerCase()
    );
    if(dup){
      saltados++;
      continue;
    }

    const costoTotal = parseFloat(linea.costoTotal) || 0;
    const unidades = parseFloat(linea.unidades) || 1;
    const precio = parseFloat(linea.precio) || 0;
    const codigo = (linea.codigo || '').trim();
    const costoUnitario = unidades > 0 ? costoTotal / unidades : 0;

    const fecha = todayISO();

    const nuevoId = uid();

    const base = {
      id: nuevoId,
      nombre,
      codigoBarras: codigo || null,
      categoriaId: _crCatId || null,
      fotoPrincipal: 0,
      cantidadFotos: linea._fotoDataUrl ? 1 : 0,
      tipo: _crTipo,
      creado: Date.now(),
      favorito: false,
      ventas: []
    };

    if(_crTipo === 'producto'){
      base.unidad = 'unidad';
      base.tipoMargen = 'precio-fijo';
      base.valorMargen = precio;
      base.stockInfinito = false;
      base.tambienMaterial = false;
      base.vendibleSuelto = true;
      base.lotes = costoTotal > 0 ? [{
        id: 'lote_' + uid(),
        fecha,
        unidadesCompradas: unidades,
        costoTotalCompra: costoTotal,
        costoUnitario,
        costoDesconocido: costoTotal === 0
      }] : [];
    } else {
      /* Material */
      base.unidad = 'g';
      base.tipoMargen = 'precio-fijo';
      base.valorMargen = precio;
      base.stockInfinito = false;
      base.vendibleSuelto = precio > 0;
      base.lotes = costoTotal > 0 ? [{
        id: 'lote_' + uid(),
        fecha,
        unidadesCompradas: unidades,
        costoTotalCompra: costoTotal,
        costoUnitario,
        costoDesconocido: costoTotal === 0
      }] : [];
    }

    if(linea._fotoDataUrl){
      try{
        await guardarFotosProducto(nuevoId, [linea._fotoDataUrl]);
        window.FOTOS[nuevoId] = [linea._fotoDataUrl];
      }catch(e){ console.warn('[CR] foto OCR no guardada:', e); }
    }

    window.DB.products.push(base);
    creados++;
  }

  saveDB();

  /* Cerrar modal */
  document.querySelector('#m-carga-rapida')?.remove();

  /* Render */
  if(typeof renderAll === 'function') renderAll();

  /* Toast */
  let msg = `✅ ${creados} ${creados === 1 ? 'producto' : 'productos'} creados`;
  if(saltados > 0){
    msg += ` · ${saltados} ya existían`;
  }
  toast(msg);

  if(navigator.vibrate) navigator.vibrate(30);
}

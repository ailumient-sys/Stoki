/* =========================================================
   app.js — Orquestador
   8 pestañas gestionadas desde 5 botones en el nav:
   Vender (1), Inventario (2), Pedidos (5), Facturar (3) + ☰ Más
   En "Más": Invertir (0), Estadísticas (4), Clientes (6),
             Proveedores (7)
   v11: precargarFotos() desde IndexedDB al arrancar
   ========================================================= */

let currentTab = 0;

const MORE_TABS = [0, 4, 6, 7, 8];

function setTab(i){
  if(i < 0 || i > 9) return;
  currentTab = i;

  $$('.view').forEach((view, idx) => {
    view.style.display = (idx === i) ? 'block' : 'none';
  });

  $$('.nav-btn[data-tab]').forEach(btn => {
    if(btn.id === 'nav-more') return;
    btn.classList.toggle('active', +btn.dataset.tab === i);
  });

  const moreBtn = document.querySelector('#nav-more');
  if(moreBtn){
    moreBtn.classList.toggle('active', MORE_TABS.includes(i));
  }

  const fab = $('#fab');
  if(fab) fab.classList.toggle('hidden', i !== 2);

  const cartFab = $('#cart-fab');
  if(cartFab){
    if(i === 1 && typeof updateCartFab === 'function'){
      updateCartFab();
    } else {
      cartFab.classList.add('hidden');
    }
  }

  if(i === 0 && typeof renderInvest === 'function')      renderInvest();
  if(i === 1 && typeof renderProductos === 'function')   renderProductos();
  if(i === 2 && typeof renderInventario === 'function')  renderInventario();
  if(i === 3 && typeof renderVentas === 'function')      renderVentas();
  if(i === 4 && typeof renderStatsPage === 'function')   renderStatsPage();
  if(i === 5 && typeof renderOrders === 'function')      renderOrders();
  if(i === 6 && typeof renderClients === 'function')     renderClients();
  if(i === 7 && typeof renderSuppliers === 'function')   renderSuppliers();
  if(i === 8 && typeof renderListas === 'function')      renderListas();
  if(i === 9 && typeof renderRestockPage === 'function') renderRestockPage();
}

function renderAll(){
  if(typeof renderInvest === 'function')     renderInvest();
  if(typeof renderProductos === 'function')  renderProductos();
  if(typeof renderInventario === 'function') renderInventario();
  if(typeof renderVentas === 'function')     renderVentas();
  if(typeof renderStatsPage === 'function')  renderStatsPage();
  if(typeof renderOrders === 'function')     renderOrders();
  if(typeof renderClients === 'function')    renderClients();
  if(typeof renderSuppliers === 'function')  renderSuppliers();
  if(typeof renderListas === 'function')     renderListas();
  if(typeof updateTasaBtn === 'function')    updateTasaBtn();
  if(typeof updateCartFab === 'function')    updateCartFab();
}

let swipeX = 0, swipeY = 0, swiping = false;

function initSwipe(){
  const views = $('#views');
  if(!views) return;

  views.addEventListener('touchstart', e => {
    /* Ignorar si el toque empieza sobre pestañas internas */
    if(e.target.closest('.inv-tabs') ||
       e.target.closest('.pv-cat-header') ||
       e.target.closest('.period') ||
       e.target.closest('.inv-chips')){
      swiping = false;
      return;
    }

    swipeX = e.touches[0].clientX;
    swipeY = e.touches[0].clientY;
    swiping = true;
  }, { passive: true });

  views.addEventListener('touchend', e => {
    if(!swiping) return;
    swiping = false;

    const dx = e.changedTouches[0].clientX - swipeX;
    const dy = e.changedTouches[0].clientY - swipeY;

    if(Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5){
      if(dx < 0 && currentTab < 9) setTab(currentTab + 1);
      if(dx > 0 && currentTab > 0) setTab(currentTab - 1);
    }
  }, { passive: true });
}

let tapState = {
  timer: null,
  startX: 0,
  startY: 0,
  target: null,
  tipo: null,
  fired: false
};

function resetTap(){
  if(tapState.timer){
    clearTimeout(tapState.timer);
    tapState.timer = null;
  }
  tapState.target = null;
  tapState.tipo = null;
  tapState.fired = false;
}

function initTapHandler(){
  document.addEventListener('touchstart', e => {
    if(e.target.closest('.btn-sell'))    return;
    if(e.target.closest('[data-sell]'))  return;
    if(e.target.closest('.sale-del'))    return;
    if(e.target.closest('.bill-del'))    return;

    const invItem = e.target.closest('.inv-item');
    const billRow = e.target.closest('.bill-row');

    let target = null;
    let tipo = null;

    if(invItem){      target = invItem;  tipo = 'inventario'; }
    else if(billRow){ target = billRow;  tipo = 'venta'; }

    if(!target) return;

    const t = e.touches[0];
    tapState.startX = t.clientX;
    tapState.startY = t.clientY;
    tapState.target = target;
    tapState.tipo   = tipo;
    tapState.fired  = false;

    tapState.timer = setTimeout(() => {
      if(tapState.target && !tapState.fired){
        tapState.fired = true;
        handleLongPress(tapState.target, tapState.tipo);
        if(navigator.vibrate) navigator.vibrate(20);
      }
    }, 500);
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if(!tapState.timer) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - tapState.startX);
    const dy = Math.abs(t.clientY - tapState.startY);
    if(dx > 12 || dy > 12) resetTap();
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if(tapState.fired){ resetTap(); return; }
    if(!tapState.timer || !tapState.target){ resetTap(); return; }

    const t = e.changedTouches[0];
    const dx = Math.abs(t.clientX - tapState.startX);
    const dy = Math.abs(t.clientY - tapState.startY);

    if(dx < 12 && dy < 12){
      handleShortTap(tapState.target, tapState.tipo);
    }

    resetTap();
  }, { passive: true });

  document.addEventListener('touchcancel', resetTap, { passive: true });
}

function handleShortTap(el, tipo){
  if(tipo === 'inventario' && el.dataset.detail){
    if(typeof openDetail === 'function') openDetail(el.dataset.detail);
    return;
  }

  if(tipo === 'venta'){
    if(el.dataset.ticket){
      if(typeof openTicket === 'function') openTicket(el.dataset.ticket);
      return;
    }
    if(el.dataset.detail){
      if(typeof openDetail === 'function') openDetail(el.dataset.detail);
    }
    return;
  }
}

function handleLongPress(el, tipo){
  /* vender-card ya no existe: el toque corto agrega directo */
}

function initGestosBloqueados(){
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('dragstart',   e => e.preventDefault());

  document.addEventListener('selectstart', e => {
    const tag = e.target.tagName;
    if(tag !== 'INPUT' && tag !== 'TEXTAREA') e.preventDefault();
  });

  document.addEventListener('gesturestart', e => e.preventDefault());

  /* El preventDefault global fue removido: bloqueaba clicks en botones nuevos.
     El CSS `touch-action: manipulation` ya evita el doble-tap zoom. */
}

function initFab(){
  const fab = $('#fab');
  if(!fab) return;

  fab.addEventListener('click', (e) => {
    if(fab._skipClick){
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    const accion = fab.dataset.accion || 'agregar';

    if(accion === 'agregar'){
      if(typeof openAddForm === 'function') openAddForm();
    } else if(accion === 'venta'){
      if(typeof openFabMenu === 'function') openFabMenu();
    }
  });
}

/* FAB de Inventario: posición fija por CSS (sin drag, posición controlada) */
function initFabMovible(){
  try{
    localStorage.removeItem('stoki_fab_pos');
  }catch(e){}

  const fab = document.querySelector('#fab');
  if(fab){
    fab.style.left = '';
    fab.style.top = '';
    fab.style.right = '';
    fab.style.bottom = '';
  }
}

function initGlobalEvents(){
  const nav = $('#bottom-nav');
  if(nav){
    nav.addEventListener('click', e => {
      const btn = e.target.closest('.nav-btn');
      if(!btn) return;

      if(btn.id === 'nav-more'){
        if(typeof openMoreMenu === 'function') openMoreMenu();
        return;
      }

      const tab = +btn.dataset.tab;
      if(!isNaN(tab)) setTab(tab);
    });
  }

  document.addEventListener('click', e => {
    if(e.target.closest('[data-close]')){
      const ov = e.target.closest('.overlay');
      if(ov) closeModal(ov);
    }
  });

  document.addEventListener('click', e => {
    const sellBtn = e.target.closest('[data-sell]');
    if(sellBtn){
      e.stopPropagation();
      if(typeof openSell === 'function') openSell(sellBtn.dataset.sell);
      return;
    }

    const detailBtn = e.target.closest('.btn-sell[data-detail]');
    if(detailBtn){
      e.stopPropagation();
      if(typeof openDetail === 'function') openDetail(detailBtn.dataset.detail);
      return;
    }
  });

  const cur = $('#currency');
  if(cur){
    cur.addEventListener('change', e => {
      const nueva = e.target.value;
      const anterior = window.DB.settings.currency;

      window.DB.settings.currency = nueva;

      /* Si la nueva moneda coincide con la de referencia, cambiarla automáticamente */
      if(window.DB.settings.refCurrency === nueva){
        const todas = ['USD','VES','COP','ARS','MXN','PEN','CLP','EUR'];
        const alternativa = todas.find(c => c !== nueva) || 'USD';
        window.DB.settings.refCurrency = alternativa;
        setTimeout(() => {
          toast(`💱 Referencia cambiada a ${alternativa}`);
        }, 400);
      }

      saveDB();
      renderAll();
      if(typeof updateTasaLabels === 'function') updateTasaLabels();
    });
  }

  const logo = $('.logo');
  if(logo){
    let logoTaps = 0;
    let logoTimer = null;

    logo.style.cursor = 'pointer';

    const manejarTap = (e) => {
      e.stopPropagation();
      logoTaps++;
      clearTimeout(logoTimer);

      if(logoTaps >= 3){
        logoTaps = 0;
        if(typeof abrirPanelBackup === 'function'){
          abrirPanelBackup();
        }
        return;
      }

      logoTimer = setTimeout(() => {
        logoTaps = 0;
      }, 1500);
    };

    logo.addEventListener('click', manejarTap);
  }


  window.addEventListener('beforeunload', saveDB);

  window.addEventListener('resize', () => {
    const modal = $('#m-stats');
    if(modal && modal.classList.contains('open')) renderStats();
  });
}

function initTasa(){
  const btn = $('#btn-tasa');
  if(btn) btn.addEventListener('click', openTasaModal);

  const save = $('#tasa-save');
  if(save) save.addEventListener('click', saveTasa);

  const clear = $('#tasa-clear');
  if(clear) clear.addEventListener('click', clearTasa);

  const ref = $('#tasa-ref');
  if(ref) ref.addEventListener('change', () => updateTasaLabels());

  updateTasaBtn();
}

function openTasaModal(){
  const s = window.DB.settings;
  const modal = $('#m-tasa');
  if(!modal){ toast('⚠️ Falta el modal de tasa'); return; }

  $('#tasa-principal').textContent = s.currency || 'USD';
  $('#tasa-ref').value = s.refCurrency || 'VES';
  $('#tasa-input').value = s.tasaDia || '';

  updateTasaLabels();
  updateTasaHint();

  const clearBtn = $('#tasa-clear');
  if(clearBtn) clearBtn.style.display = (s.tasaDia > 0) ? 'block' : 'none';

  openModal('#m-tasa');
  setTimeout(() => $('#tasa-input').focus(), 300);
}

function updateTasaLabels(){
  const refEl = $('#tasa-ref');
  if(!refEl) return;

  const principal = window.DB.settings.currency || 'USD';

  /* Ocultar la moneda principal de las opciones de referencia */
  Array.from(refEl.options).forEach(opt => {
    if(opt.value === principal){
      opt.disabled = true;
      opt.style.display = 'none';
    } else {
      opt.disabled = false;
      opt.style.display = '';
    }
  });

  /* Si la actual está bloqueada, cambiar a la primera disponible */
  if(refEl.value === principal){
    const disponible = Array.from(refEl.options).find(o => !o.disabled);
    if(disponible){
      refEl.value = disponible.value;
      window.DB.settings.refCurrency = disponible.value;
      saveDB();
    }
  }

  const ref = refEl.value;

  const nombres = {
    USD:'USD $', VES:'Bs', COP:'COP $', ARS:'ARS $',
    MXN:'MXN $', PEN:'S/', CLP:'CLP $', EUR:'€'
  };

  const refLabel = $('#tasa-ref-label');
  if(refLabel) refLabel.textContent = nombres[ref] || ref;

  const priLabel = $('#tasa-principal-label');
  if(priLabel) priLabel.textContent = nombres[principal] || principal;
}

function updateTasaHint(){
  const s = window.DB.settings;
  const hint = $('#tasa-hint');
  if(!hint) return;

  if(s.tasaActualizada){
    const fecha = new Date(s.tasaActualizada);
    const diffMin = Math.floor((new Date() - fecha) / 60000);

    let cuando;
    if(diffMin < 1) cuando = 'hace segundos';
    else if(diffMin < 60) cuando = `hace ${diffMin} min`;
    else if(diffMin < 1440) cuando = `hace ${Math.floor(diffMin/60)} h`;
    else cuando = `hace ${Math.floor(diffMin/1440)} días`;

    hint.textContent = `Última actualización: ${cuando}`;
  } else {
    hint.textContent = 'Última actualización: nunca';
  }
}

function saveTasa(){
  const ref = $('#tasa-ref').value;
  const tasa = +$('#tasa-input').value || 0;

  if(tasa <= 0) return toast('⚠️ Ingresá una tasa mayor a 0');

  window.DB.settings.refCurrency = ref;
  window.DB.settings.tasaDia = tasa;
  window.DB.settings.tasaActualizada = new Date().toISOString();

  saveDB();
  closeModal('#m-tasa');
  updateTasaBtn();
  renderAll();
  toast(`✅ Tasa guardada: 1 ${window.DB.settings.currency} = ${tasa} ${ref}`);
}

function clearTasa(){
  confirmarAccion({
    titulo: 'Desactivar referencia',
    mensaje: 'No se mostrarán los valores en la segunda moneda.',
    botonOk: 'Desactivar',
    botonCancel: 'Cancelar',
    colorOk: 'rojo'
  }).then(ok => {
    if(!ok) return;

    window.DB.settings.tasaDia = 0;
    window.DB.settings.tasaActualizada = null;

    saveDB();
    closeModal('#m-tasa');
    updateTasaBtn();
    renderAll();
    toast('✅ Referencia desactivada');
  });
}

function updateTasaBtn(){
  const btn = $('#btn-tasa');
  if(!btn) return;
  btn.classList.toggle('activa', (window.DB.settings.tasaDia || 0) > 0);
}

function initBackButton(){
  try{
    const CapApp = window.Capacitor?.Plugins?.App;

    const cerrarAlgo = () => {
      if(document.querySelector('#m-more')){ closeMoreMenu(); return true; }
      if(document.querySelector('#m-fab-menu')){ closeFabMenu(); return true; }
      if(document.querySelector('#m-picker')){ closePicker(); return true; }
      if(document.querySelector('#m-cart')){ closeCartModal(); return true; }
      if(document.querySelector('#m-ticket')){ closeTicket(); return true; }
      if(document.querySelector('#m-export')){ closeExport(); return true; }
      if(document.querySelector('#m-ped-export')){ closePedidoExport(); return true; }
      if(document.querySelector('#m-business')){ closeBusiness(); return true; }
      if(document.querySelector('#m-client')){ closeClientDetail(); return true; }
      if(document.querySelector('#m-client-edit')){ document.querySelector('#m-client-edit').remove(); return true; }
      if(document.querySelector('#m-supplier')){ closeSupplierDetail(); return true; }
      if(document.querySelector('#m-supplier-edit')){ document.querySelector('#m-supplier-edit').remove(); return true; }
      if(document.querySelector('#m-confirm')){ document.querySelector('#m-confirm').remove(); return true; }

      const abierto = document.querySelector('.overlay.open');
      if(abierto){
        if(abierto.id === 'm-scan' && typeof closeScanner === 'function'){
          closeScanner();
        } else {
          closeModal(abierto);
        }
        return true;
      }
      return false;
    };

    if(CapApp){
      CapApp.addListener('backButton', () => {
        if(cerrarAlgo()) return;
        if(currentTab > 0){ setTab(0); return; }
        CapApp.exitApp();
      });
      return;
    }

    try{
      history.pushState({ stoki: true }, '', location.href);
    }catch(e){
      console.warn('pushState no disponible:', e.message || e);
      return;
    }

    window.addEventListener('popstate', () => {
      if(cerrarAlgo()){
        try{ history.pushState({ stoki: true }, '', location.href); }catch(e){}
        return;
      }

      if(currentTab > 0){
        setTab(0);
        try{ history.pushState({ stoki: true }, '', location.href); }catch(e){}
      }
    });
  }catch(e){
    console.warn('initBackButton falló:', e.message || e);
  }
}

function initStatusBar(){
  const sb = window.Capacitor?.Plugins?.StatusBar;
  if(!sb) return;
  try{
    sb.setStyle({ style: 'DARK' });
    sb.setBackgroundColor({ color: '#0f1115' });
    sb.setOverlaysWebView({ overlay: false });
    sb.show();
  }catch(e){ console.warn('StatusBar no disponible', e); }
}

function initSplash(){
  const sp = window.Capacitor?.Plugins?.SplashScreen;
  if(!sp) return;
  try{
    sp.hide({ fadeOutDuration: 300 });
  }catch(e){ console.warn('SplashScreen no disponible', e); }
}

function safeInit(nombre, fn){
  try{ fn(); }
  catch(e){ console.warn(`[init] Falló "${nombre}":`, e); }
}

async function init(){
  /* Cargar DB completo de IndexedDB (o migrar de localStorage) */
  try{
    await loadDB();
  }catch(e){
    console.warn('[init] loadDB falló:', e);
  }

  /* Cargar fotos y comprobantes */
  try{
    await precargarFotos();
  }catch(e){
    console.warn('[init] precargarFotos falló:', e);
  }

  /* Aplicar apariencia guardada */
  try{
    if(typeof aplicarApariencia === 'function') aplicarApariencia();
  }catch(e){
    console.warn('[init] aplicarApariencia falló:', e);
  }

  /* Verificar licencia */
  try{
    if(typeof verificarLicencia === 'function'){
      await verificarLicencia();
      console.log('[Licencia]', window.STOKI_LIC);

      if(!window.STOKI_LIC.activa){
        if(typeof mostrarPantallaBloqueo === 'function'){
          mostrarPantallaBloqueo();
        }
      } else if(window.STOKI_LIC.trial){
        if(typeof mostrarPantallaActivacion === 'function'){
          setTimeout(() => {
            try{
              const visto = sessionStorage.getItem('lic_pantalla_vista');
              if(!visto){
                mostrarPantallaActivacion();
                sessionStorage.setItem('lic_pantalla_vista', '1');
              }
            }catch(e){}
          }, 1500);
        }
      }
    }
  }catch(e){
    console.warn('[init] verificarLicencia falló:', e);
  }

  safeInit('loadSession', () => loadSession());
  safeInit('loadCarrito', () => loadCarrito());

  safeInit('currency', () => {
    if($('#currency')) $('#currency').value = window.DB.settings.currency || 'USD';
  });

  safeInit('fecha', () => {
    if($('#f-fecha')) $('#f-fecha').value = todayISO();
  });

  safeInit('renderAll', () => renderAll());
  safeInit('setTab', () => setTab(0));

  safeInit('tasa',         () => initTasa());
  safeInit('tasaAviso',    () => initTasaAviso());
  safeInit('business',     () => initBusiness());
  safeInit('fab',          () => { initFab(); initFabMovible(); });
  safeInit('cart',         () => initCart());
  safeInit('invest',       () => initInvest());
  safeInit('productForm',  () => initProductForm());
  safeInit('sell',         () => initSell());
  safeInit('restock',      () => initRestock());
  safeInit('scanner',      () => initScanner());
  safeInit('swipe',        () => initSwipe());
  safeInit('tapHandler',   () => initTapHandler());
  safeInit('gestos',       () => initGestosBloqueados());
  safeInit('globalEvents', () => initGlobalEvents());
  safeInit('backButton',   () => initBackButton());
  safeInit('statusBar',    () => initStatusBar());
  safeInit('splash',       () => initSplash());
  safeInit('orders',       () => initOrders());
  safeInit('onboarding',   () => initOnboarding());
  safeInit('busquedaGlobal', () => initBusquedaGlobal());

  if('serviceWorker' in navigator && location.protocol.startsWith('http')){
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', () => init());
} else {
  init();
}

/* =========================================================
   Zoom en previews de facturas (delegation)
   ========================================================= */
document.addEventListener('click', e => {
  const img = e.target.closest('.export-preview img');
  if(img){
    img.classList.toggle('zoom');
  }
});



/* ═══════════════════════════════════════════
   EVENT DELEGATION GLOBAL — Botones críticos
   Resuelve taps que no responden por re-render
   ═══════════════════════════════════════════ */
document.addEventListener('click', function(e){
  /* Botón nueva cita */
  if(e.target.closest('#cita-nueva')){
    e.preventDefault(); e.stopPropagation();
    if(typeof abrirNuevaCita === 'function'){
      abrirNuevaCita();
    } else {
      console.warn('[Cita] abrirNuevaCita no definida');
    }
    return;
  }

  /* Tabs de citas/pedidos */
  var tab = e.target.closest('.orders-tab[data-ovista]');
  if(tab){
    e.preventDefault(); e.stopPropagation();
    if(typeof window.setOrdersVista === 'function'){
      window.setOrdersVista(tab.dataset.ovista);
    } else if(typeof renderOrders === 'function') {
      renderOrders();
    }
    return;
  }

  /* Registrar movimiento */
  if(e.target.closest('#cie-movimiento')){
    e.preventDefault(); e.stopPropagation();
    if(typeof abrirMovimiento === 'function') abrirMovimiento();
    return;
  }

  /* Guardar cierre del día */
  if(e.target.closest('#cie-guardar')){
    e.preventDefault(); e.stopPropagation();
    if(typeof guardarCierreActual === 'function') guardarCierreActual();
    return;
  }

  /* Exportar cierre */
  if(e.target.closest('#cie-exportar')){
    e.preventDefault(); e.stopPropagation();
    if(typeof abrirModalExportarCierre === 'function') abrirModalExportarCierre();
    return;
  }

  /* Botón + Stock en restock page */
  var rpadd = e.target.closest('[data-rpadd]');
  if(rpadd){
    e.preventDefault(); e.stopPropagation();
    if(typeof abrirRestockItem === 'function') abrirRestockItem(rpadd.dataset.rpadd);
    return;
  }

  /* Exportar lista de compras */
  if(e.target.closest('#rp-exportar')){
    e.preventDefault(); e.stopPropagation();
    if(typeof exportarListaCompras === 'function') exportarListaCompras();
    return;
  }

  /* Historial de cierres desde el cierre */
  if(e.target.closest('#cie-historial')){
    e.preventDefault(); e.stopPropagation();
    var modalCierre = document.querySelector('#m-cierre');
    if(modalCierre) modalCierre.remove();
    setTimeout(function(){
      if(typeof abrirCierresHistorial === 'function') abrirCierresHistorial();
    }, 150);
    return;
  }

  /* Mini-modal selector */
  if(e.target.closest('#cs-hoy')){
    e.preventDefault(); e.stopPropagation();
    var sel1 = document.querySelector('#m-cierre-selector');
    if(sel1) sel1.remove();
    setTimeout(function(){
      if(typeof abrirCierreDiario === 'function') abrirCierreDiario();
    }, 150);
    return;
  }

  if(e.target.closest('#cs-historial')){
    e.preventDefault(); e.stopPropagation();
    var sel2 = document.querySelector('#m-cierre-selector');
    if(sel2) sel2.remove();
    setTimeout(function(){
      if(typeof abrirCierresHistorial === 'function') abrirCierresHistorial();
    }, 150);
    return;
  }

  /* Tabs de filtro de stats por tipo */
  var stTab = e.target.closest('[data-sttipo]');
  if(stTab){
    e.preventDefault(); e.stopPropagation();
    if(typeof statsPageFiltroTipo !== 'undefined'){
      window.statsPageFiltroTipo = stTab.dataset.sttipo;
    }
    if(typeof renderStatsPage === 'function') renderStatsPage();
    return;
  }

  /* Botón nuevo cliente */
  if(e.target.closest('#cli-nuevo')){
    e.preventDefault(); e.stopPropagation();
    if(typeof openClientNew === 'function') openClientNew();
    return;
  }
}, true);

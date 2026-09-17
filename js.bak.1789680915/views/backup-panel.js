/* =========================================================
   views/backup-panel.js — Panel exclusivo (3 toques en logo)
   Exportar / Importar backup completo
   ========================================================= */

function abrirPanelBackup(){
  if(document.querySelector('#m-backup')) return;

  const productos = (window.DB.products || []).length;
  const fotos = Object.keys(window.FOTOS || {}).length;
  const comps = Object.keys(window.COMPROBANTES || {}).length;
  const tickets = (window.DB.tickets || []).length;
  const orders = (window.DB.orders || []).length;

  const html = `
    <div class="overlay centered open" id="m-backup">
      <div class="sheet" style="position:relative;max-width:400px">
        <button class="x" id="bk-close">✕</button>

        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:44px;margin-bottom:8px">🔐</div>
          <h2 style="margin:0 0 4px">Backup y restauración</h2>
          <div class="sub" style="margin:0">
            Herramienta avanzada — no compartas esta pantalla.
          </div>
        </div>

        <div class="bk-stats">
          <div class="bk-stat">
            <div class="bk-stat-num">${productos}</div>
            <div class="bk-stat-lbl">Productos</div>
          </div>
          <div class="bk-stat">
            <div class="bk-stat-num">${fotos}</div>
            <div class="bk-stat-lbl">Fotos</div>
          </div>
          <div class="bk-stat">
            <div class="bk-stat-num">${tickets}</div>
            <div class="bk-stat-lbl">Tickets</div>
          </div>
          <div class="bk-stat">
            <div class="bk-stat-num">${orders}</div>
            <div class="bk-stat-lbl">Pedidos</div>
          </div>
          <div class="bk-stat">
            <div class="bk-stat-num">${comps}</div>
            <div class="bk-stat-lbl">Comprobantes</div>
          </div>
        </div>

        <button class="btn-main" id="bk-export" style="margin-top:20px">
          📤 Exportar backup completo
        </button>
        <div class="bk-hint">
          Incluye productos, fotos, ventas, pedidos y configuración.
        </div>

        <button class="btn-ghost" id="bk-import" style="margin-top:14px">
          📥 Importar backup
        </button>
        <div class="bk-hint">
          Reemplaza TODOS los datos actuales por los del archivo.
        </div>

        <button class="btn-ghost btn-danger" id="bk-reset"
                style="margin-top:14px">
          🗑️ Reset total (borrar todo)
        </button>
        <div class="bk-hint" style="color:var(--red)">
          Borra absolutamente todos los datos. Irreversible.
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  const cerrar = () => {
    const el = document.querySelector('#m-backup');
    if(el) el.remove();
  };

  document.querySelector('#bk-close').addEventListener('click', cerrar);
  document.querySelector('#m-backup').addEventListener('click', e => {
    if(e.target.id === 'm-backup') cerrar();
  });

  /* Exportar */
  document.querySelector('#bk-export').addEventListener('click', () => {
    cerrar();
    setTimeout(() => exportBackup(), 150);
  });

  /* Importar */
  document.querySelector('#bk-import').addEventListener('click', () => {
    cerrar();
    setTimeout(() => abrirImportBackup(), 150);
  });

  /* Reset */
  document.querySelector('#bk-reset').addEventListener('click', async () => {
    const ok = await confirmarAccion({
      titulo: '¿Borrar TODO?',
      mensaje: 'Se borrarán TODOS los datos:\n' +
               '• Productos\n' +
               '• Ventas\n' +
               '• Pedidos\n' +
               '• Clientes\n' +
               '• Fotos\n' +
               '• Comprobantes\n' +
               '• Configuración\n\n' +
               'Esta acción NO se puede deshacer.',
      botonOk: 'Borrar todo',
      botonCancel: 'Cancelar',
      colorOk: 'rojo'
    });

    if(!ok) return;

    /* Confirmar 2 veces (paranoia) */
    const ok2 = await confirmarAccion({
      titulo: '⚠️ Última confirmación',
      mensaje: '¿Estás SEGURO? Todos los datos se perderán.',
      botonOk: 'Sí, borrar',
      botonCancel: 'Cancelar',
      colorOk: 'rojo'
    });

    if(!ok2) return;

    /* Borrar todo */
    try{
      window.DB.products = [];
      window.DB.tickets = [];
      window.DB.clients = [];
      window.DB.suppliers = [];
      window.DB.orders = [];
      window.DB.categories = [];
      window.DB.historialCompras = [];
      window.DB.shoppingLists = [];
      window.DB.ventaCounter = {};
      window.FOTOS = {};
      window.COMPROBANTES = {};

      await idbSet('db', window.DB);

      /* Borrar fotos y comprobantes de IndexedDB */
      const db = await abrirFotosDB();
      await new Promise((resolve) => {
        const tx = db.transaction(FOTOS_STORE, 'readwrite');
        tx.objectStore(FOTOS_STORE).clear();
        tx.oncomplete = resolve;
      });
      await new Promise((resolve) => {
        const tx = db.transaction(COMPROB_STORE, 'readwrite');
        tx.objectStore(COMPROB_STORE).clear();
        tx.oncomplete = resolve;
      });

      cerrar();
      renderAll();
      toast('🗑️ Todo borrado');
    }catch(e){
      console.error('Error al resetear:', e);
      toast('⚠️ No se pudo resetear');
    }
  });
}

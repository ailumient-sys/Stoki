/* =========================================================
   views/more-menu.js — Menú "Más" (☰)
   Sheet inferior con las pestañas secundarias:
   Invertir, Estadísticas, Clientes, Proveedores
   ========================================================= */

const MORE_ITEMS = [
  { tab: 0, icon: '💰', titulo: 'Invertir',      sub: 'Planificá tu próxima compra' },
  { tab: 4, icon: '📈', titulo: 'Estadísticas',  sub: 'Gráficos y productos top' },
  { tab: 6, icon: '👥', titulo: 'Clientes',      sub: 'Historial por cliente' },
  { action: 'categorias', icon: '🏷️', titulo: 'Categorías',    sub: 'Organizá tus productos' },
  { action: 'ayuda',      icon: '❓', titulo: 'Ayuda',         sub: 'Guía de la app' },
  { action: 'apariencia', icon: '🎨', titulo: 'Apariencia',    sub: 'Cambiá el tema y fondo' },
  { action: 'backup',     icon: '🔐', titulo: 'Backup',        sub: 'Exportar / importar datos' },
  { action: 'cierre',     icon: '📊', titulo: 'Cierre del día', sub: 'Reporte diario de ventas' },
  { tab: 8, icon: '🛒', titulo: 'Compras',        sub: 'Calculadora de compras' },
  { tab: 7, icon: '🏭', titulo: 'Proveedores',   sub: 'Datos y WhatsApp directo' }
];

function openMoreMenu(){
  if(document.querySelector('#m-more')) return;

  const opciones = MORE_ITEMS.map(item => `
    <button class="fab-menu-option" data-go="${item.tab !== undefined ? item.tab : ''}" data-action="${item.action || ''}" type="button">
      <span class="fab-menu-icon">${item.icon}</span>
      <span class="fab-menu-text">
        <span class="fab-menu-title">${item.titulo}</span>
        <span class="fab-menu-sub">${item.sub}</span>
      </span>
    </button>
  `).join('');

  const html = `
    <div class="overlay fab-menu-overlay open" id="m-more">
      <div class="fab-menu">
        ${opciones}
        <button class="fab-menu-cancel" id="more-cerrar" type="button">Cerrar</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#more-cerrar').addEventListener('click', closeMoreMenu);

  document.querySelector('#m-more').addEventListener('click', e => {
    if(e.target.id === 'm-more') closeMoreMenu();
  });

  document.querySelectorAll('#m-more .fab-menu-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.go;
      const action = btn.dataset.action;
      closeMoreMenu();
      if(action === 'apariencia'){
        setTimeout(() => abrirApariencia(), 120);
      } else if(action === 'ayuda'){
        setTimeout(() => abrirAyuda(), 120);
      } else if(action === 'categorias'){
        setTimeout(() => abrirGestionCategorias(), 120);
      } else if(action === 'backup'){
        setTimeout(() => abrirPanelBackup(), 120);
      } else if(action === 'cierre'){
        setTimeout(() => abrirCierreDiario(), 120);
      } else if(tab !== undefined && tab !== ''){
        setTimeout(() => setTab(+tab), 120);
      }
    });
  });

  if(navigator.vibrate) navigator.vibrate(10);
}

function closeMoreMenu(){
  const el = document.querySelector('#m-more');
  if(el) el.remove();
}


/* =========================================================
   views/help.js — Sistema de ayuda
   ========================================================= */

const HELP_SECCIONES = [
  {
    id: 'invertir',
    icono: '💰',
    titulo: 'Invertir',
    items: [
      {
        titulo: '¿Para qué sirve?',
        texto: 'Planificá tu próxima compra antes de gastar. Ingresás tu capital, agregás los productos que querés comprar y la app te muestra cuánto vas a ganar estimado.'
      },
      {
        titulo: 'Cómo empezar',
        texto: 'Tocá "🚀 Empezar a invertir". Ingresá el capital disponible. Ahora agregá productos a la lista con el botón "+ Agregar producto".'
      },
      {
        titulo: 'Agregar un producto',
        texto: 'Completá nombre, unidades y costo. Elegí cómo querés calcular el precio de venta: % de ganancia, monto fijo, o precio final. Podés agregar foto, categoría, código de barras y si es restockeable.'
      },
      {
        titulo: 'Editar el capital',
        texto: 'Tocá la tarjeta "💰 Capital disponible" arriba para editarlo o ampliarlo en cualquier momento.'
      },
      {
        titulo: 'Simulador de precios',
        texto: 'En la parte superior hay botones (30%, 40%, 50%...). Tocá uno para ver cómo cambiaría tu ganancia si aplicaras ese margen a todos los productos.'
      },
      {
        titulo: 'Historial de compras',
        texto: 'Al final de la pantalla hay una sección colapsable con las últimas compras que finalizaste. Tocá una para ver el detalle completo.'
      },
      {
        titulo: 'Finalizar la compra',
        texto: 'Cuando termines de armar la lista, tocá "✅ Finalizar compra". Se abrirá un modal donde elegís cuáles productos agregar al catálogo. Los seleccionados se suman a Inventario.'
      }
    ]
  },
  {
    id: 'vender',
    icono: '🛒',
    titulo: 'Vender',
    items: [
      {
        titulo: '¿Para qué sirve?',
        texto: 'Registrar ventas de una sola vez (venta única) o armar un carrito con varios productos (venta múltiple).'
      },
      {
        titulo: 'Venta única',
        texto: 'En la lista de productos, tocá el botón "🛒 Vender" de la tarjeta. Elegí cantidad y precio, después "Registrar venta".'
      },
      {
        titulo: 'Venta múltiple (carrito)',
        texto: 'Mantené presionada una tarjeta de producto para agregarla al carrito. Repetí con más productos. Aparecerá un botón flotante verde abajo a la derecha con el total. Tocalo para finalizar.'
      },
      {
        titulo: 'Confirmar pago',
        texto: 'Al confirmar una venta, se abre un modal con el total. Podés asignar un cliente (opcional), marcar si fue en efectivo, y confirmar.'
      },
      {
        titulo: 'Agregar cliente rápido',
        texto: 'En el modal de confirmación, tocá el selector de cliente → "➕ Agregar nuevo cliente". Cargá nombre, cédula y teléfono. Se guarda automáticamente.'
      },
      {
        titulo: 'Cancelar una venta',
        texto: 'Andá a Facturar (🧾). Buscá la factura en la lista. Tocá el ícono 🗑️ de la fila. Se restaura el stock automáticamente.'
      }
    ]
  },
  {
    id: 'inventario',
    icono: '📊',
    titulo: 'Inventario',
    items: [
      {
        titulo: '¿Para qué sirve?',
        texto: 'Ver todos tus productos, organizados por categoría. Cada card muestra la foto, el nombre, el stock (con un punto de color) y si ya recuperaste la inversión (punto inferior).'
      },
      {
        titulo: 'Crear un producto',
        texto: 'Tocá el botón "+" flotante abajo a la derecha. También podés usar el botón "➕" en cada sección de categoría.'
      },
      {
        titulo: 'Buscar un producto',
        texto: 'Usá la barra de búsqueda arriba. También podés tocar el ícono 📷 para escanear un código de barras.'
      },
      {
        titulo: 'Ordenar',
        texto: 'Los botones redondos (🕐 🔤 📉 ⚠️ ❤️) ordenan por: recientes, alfabético, stock bajo, alertas y favoritos.'
      },
      {
        titulo: 'Favoritos',
        texto: 'Tocá el corazón 🤍 sobre una card para marcarlo como favorito. Después podés filtrar solo los favoritos con el botón ❤️.'
      },
      {
        titulo: 'Ver el detalle',
        texto: 'Tocá una card para abrir el detalle. Ahí ves: fotos, termómetro de inversión, KPIs, historial de compras, y botones para reabastecer, editar o eliminar.'
      },
      {
        titulo: 'Reabastecer',
        texto: 'En el detalle del producto, tocá "📦 Reabastecer". Ingresás cuántas unidades compraste y el costo. Se crea un nuevo lote y podés asignar un proveedor.'
      },
      {
        titulo: 'Categorías',
        texto: 'Para organizar productos, andá a Más → 🏷️ Categorías. Creá categorías con emoji y asignálas al crear/editar productos. Los productos se agrupan solos por categoría.'
      }
    ]
  },
  {
    id: 'facturar',
    icono: '🧾',
    titulo: 'Facturar',
    items: [
      {
        titulo: '¿Para qué sirve?',
        texto: 'Historial completo de todas las ventas agrupadas por día. Cada fila muestra la hora, productos, total y ganancia.'
      },
      {
        titulo: 'Ver una factura',
        texto: 'Tocá una fila para abrir el ticket completo. Ahí ves los productos, total, ganancia, y podés exportarla como PNG.'
      },
      {
        titulo: 'Exportar una factura',
        texto: 'Dentro del ticket, tocá "📤 Exportar factura". Se genera un PNG y se abre el menú para compartirlo (WhatsApp, Drive, etc.) o guardarlo.'
      },
      {
        titulo: 'Cancelar una factura',
        texto: 'En la lista, tocá el ícono 🗑️ de la fila. Se restaura el stock y se borra la venta.'
      },
      {
        titulo: 'Efectivo',
        texto: 'Si una venta se marcó como "efectivo" al confirmarla, aparece un 💵 al lado de la hora.'
      }
    ]
  },
  {
    id: 'pedidos',
    icono: '📦',
    titulo: 'Pedidos',
    items: [
      {
        titulo: '¿Para qué sirve?',
        texto: 'Gestionar pedidos de clientes con seguimiento: pago, envío y entrega. El stock se reserva automáticamente hasta cerrar el pedido.'
      },
      {
        titulo: 'Crear un pedido',
        texto: 'Tocá "➕ Nuevo pedido". Elegí un cliente (obligatorio), agregá productos con el botón "+ Agregar producto", y tocá "✅ Crear pedido".'
      },
      {
        titulo: 'Los 3 checks',
        texto: 'En el detalle del pedido hay 3 estados: 💵 Pagado, 🚚 Enviado, 📬 Entregado. Tocá cada uno para marcarlo. Al marcar Pagado te pide el comprobante (efectivo, referencia o captura).'
      },
      {
        titulo: 'Cerrar el pedido',
        texto: 'Cuando los 3 checks estén marcados, aparece "✅ Cerrar pedido y descontar stock". Al cerrarlo se descuenta el stock real y se crea una factura automáticamente.'
      },
      {
        titulo: 'Cancelar',
        texto: 'Con "🚫 Cancelar pedido" se libera el stock reservado. El pedido queda como cancelado.'
      },
      {
        titulo: 'Compartir',
        texto: 'Podés compartir por WhatsApp (texto con detalle) o como factura PNG. Ambos botones están en el detalle.'
      }
    ]
  },
  {
    id: 'clientes',
    icono: '👥',
    titulo: 'Clientes',
    items: [
      {
        titulo: '¿Para qué sirve?',
        texto: 'Guardar datos de clientes para usarlos en ventas y pedidos. Podés ver cuánto gastó cada uno y todas sus facturas.'
      },
      {
        titulo: 'Agregar un cliente',
        texto: 'Se agregan al confirmar una venta o al crear un pedido. También desde el detalle de un cliente → "✏️ Editar cliente".'
      },
      {
        titulo: 'Ver detalle',
        texto: 'Tocá un cliente para ver sus compras, total gastado y todas sus facturas.'
      },
      {
        titulo: 'Buscar',
        texto: 'Escribí en la barra de búsqueda para filtrar por nombre, cédula o teléfono.'
      }
    ]
  },
  {
    id: 'proveedores',
    icono: '🏭',
    titulo: 'Proveedores',
    items: [
      {
        titulo: '¿Para qué sirve?',
        texto: 'Guardar datos de a quién le comprás. Al reabastecer un producto, podés asignar de qué proveedor vino.'
      },
      {
        titulo: 'Agregar un proveedor',
        texto: 'Tocá "➕ Nuevo proveedor". Cargá nombre, tienda, teléfono, país (para WhatsApp) y notas.'
      },
      {
        titulo: 'Productos por proveedor',
        texto: 'En el detalle del proveedor ves todos los productos que le compraste. Podés agregar manualmente con "➕ Agregar".'
      },
      {
        titulo: 'Pedir por WhatsApp',
        texto: 'En el detalle, seleccioná los productos que querés y tocá "💬 Pedir por WhatsApp". Se abre WhatsApp con el mensaje pre-armado.'
      },
      {
        titulo: 'Desde Reabastecer',
        texto: 'Al reabastecer un producto, aparece una lista con los proveedores que lo venden (ordenados por precio más barato). Tocás uno y queda asignado.'
      }
    ]
  },
  {
    id: 'categorias',
    icono: '🏷️',
    titulo: 'Categorías',
    items: [
      {
        titulo: '¿Para qué sirve?',
        texto: 'Organizar productos por tipo (Bebidas, Comida, Electrónica, etc.). Se agrupan automáticamente en Inventario.'
      },
      {
        titulo: 'Crear una categoría',
        texto: 'Andá a Más → 🏷️ Categorías → "➕ Nueva categoría". Poné nombre y elegí un emoji.'
      },
      {
        titulo: 'Asignar a productos',
        texto: 'Al crear o editar un producto, tocá "🏷️ Categoría" y elegí una. También podés crear una nueva desde ese mismo selector.'
      },
      {
        titulo: 'Ver agrupados',
        texto: 'En Inventario, los productos aparecen agrupados por categoría. Tocá el header de la categoría para colapsar o expandir.'
      }
    ]
  },
  {
    id: 'exportar',
    icono: '📄',
    titulo: 'Exportar PDF',
    items: [
      {
        titulo: '¿Qué podés exportar?',
        texto: 'En Inventario, tocá "📄 Exportar". Se abre un modal para elegir: Catálogo (con fotos), Inventario (tabla técnica) o Ambos.'
      },
      {
        titulo: 'Catálogo',
        texto: 'Ideal para compartir con clientes. Muestra las fotos de los productos con nombre y precio. 6 productos por página. Lleva tu logo Stoki de fondo.'
      },
      {
        titulo: 'Inventario',
        texto: 'Tabla técnica con costo, precio, stock y valor. Útil para uso interno.'
      },
      {
        titulo: 'Separar por categoría',
        texto: 'Activá el toggle para que cada categoría empiece en una página nueva. El footer muestra "Categoría 1/2" con la página actual.'
      },
      {
        titulo: 'Imagen de fondo',
        texto: 'Podés subir una imagen de fondo para el PDF (ej: tu logo de marca o patrón). Se muestra translúcida detrás de los productos. Tu logo Stoki va siempre encima.'
      }
    ]
  },
  {
    id: 'config',
    icono: '⚙️',
    titulo: 'Configuración',
    items: [
      {
        titulo: '🏪 Datos del negocio',
        texto: 'Tocá el ícono 🏪 arriba. Cargá nombre, RIF, teléfono y dirección. Estos datos aparecen en todas las facturas y PDFs que exportes.'
      },
      {
        titulo: '💱 Tasa del día',
        texto: 'Tocá el ícono 💱. Elegí tu moneda principal (USD, EUR, etc.) y una moneda de referencia (VES, COP, etc.). Ingresá cuántos Bs vale 1 USD. Todos los montos se van a mostrar en las 2 monedas.'
      },
      {
        titulo: 'Moneda',
        texto: 'El selector "USD $" del header te permite cambiar la moneda principal. Los nuevos cálculos se hacen con la nueva moneda.'
      },
      {
        titulo: '🔍 Búsqueda global',
        texto: 'El ícono 🔍 del header abre un buscador que abarca productos, clientes, proveedores, pedidos y facturas. Escribí al menos 2 letras.'
      },
      {
        titulo: 'Respaldo',
        texto: 'Tocá el logo "Stoki" 2 veces seguidas para descargar un respaldo JSON con todos tus datos.'
      }
    ]
  }
];

function abrirAyuda(){
  if(document.querySelector('#m-ayuda')) return;

  const seccionesHTML = HELP_SECCIONES.map(sec => `
    <div class="ayuda-seccion" data-sec="${sec.id}">
      <div class="ayuda-header">
        <span class="ayuda-icono">${sec.icono}</span>
        <span class="ayuda-titulo">${sec.titulo}</span>
        <span class="ayuda-chevron">▶</span>
      </div>
      <div class="ayuda-body">
        ${sec.items.map(item => `
          <div class="ayuda-item">
            <div class="ayuda-item-titulo">${item.titulo}</div>
            <div class="ayuda-item-texto">${item.texto}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  const html = `
    <div class="overlay centered open ayuda-modal" id="m-ayuda">
      <div class="sheet" style="position:relative">
        <button class="x" id="ayuda-close">✕</button>
        <h2>❓ Ayuda</h2>
        <div class="sub">Guía rápida de todas las funciones.</div>

        <div class="ayuda-secciones">
          ${seccionesHTML}
        </div>

        <div class="ayuda-footer">
          ¿Falta algo? Escribinos en el repo.
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  document.querySelector('#ayuda-close').addEventListener('click', cerrarAyuda);
  document.querySelector('#m-ayuda').addEventListener('click', e => {
    if(e.target.id === 'm-ayuda') cerrarAyuda();
  });

  document.querySelectorAll('.ayuda-header').forEach(header => {
    header.addEventListener('click', () => {
      const sec = header.closest('.ayuda-seccion');
      sec.classList.toggle('open');
    });
  });
}

function cerrarAyuda(){
  const el = document.querySelector('#m-ayuda');
  if(el) el.remove();
}

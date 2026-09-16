=== STOKI — CONTEXTO ACTUAL ===

APP: Stoki
TIPO: HTML/CSS/JS puro + Capacitor (APK)
STORAGE: localStorage 'stocki_v1', version v7
CACHE SW: stoki-v15
APPID: com.stoki.app
DEV: Android + Chrome + Codespaces
DEBUG: Eruda

ESTRUCTURA:
css/: base, components, views, modals, misc
js/core/: storage, format, ui, scanner
js/calc.js, js/app.js, js/lib/charts.js
js/views/: onboarding, invest, products, product-form,
inventory, detail, sell, cart, business, ticket,
restock, stats, sales, stats-page, orders, clients

7 PESTAÑAS ACTUALES:
0. Invertir ✅
1. Vender ✅
2. Inventario ✅
3. Facturar ✅
4. Estadísticas 🔵 placeholder
5. Pedidos 🔵 placeholder
6. Clientes ✅

FEATURES IMPLEMENTADAS:
- Multi-lote FIFO + snapshot de costo
- Restock con comparativa de precios
- Multi-fotos (6) con compresión diferenciada
- Favoritos + búsqueda sin tildes + 5 modos orden
- Alertas stock (verde/amarillo/rojo/gris)
- Modo Invertir completo
- Escáner códigos (html5-qrcode CDN)
- Carrito + tickets agrupados
- Tasa dual USD↔VES con snapshot por venta
- Pop-up confirmación pago
- Nomenclatura YYYYMMDD-NNN
- Onboarding 3 slides
- Clientes con historial + búsqueda
- Exportar factura PNG + WhatsApp
- Datos del negocio
- Editar productos
- Cancelar ventas + restaurar stock

=== LISTA URGENTES PENDIENTES ===

1. Modo Invertir — capital editable
   - Tap en tarjeta capital → modal editar valor
   - Funciona en cualquier momento

2. Formulario producto — margen fijo por unidad o lote
   - Toggle al elegir "Valor fijo"
   - Aplica en product-form.js, invest.js, restock.js

3. Detalle producto — barra bipolar (termómetro)
   - Centro = capital recuperado
   - Izquierda = rojo (perdiendo)
   - Derecha = verde (ganando)
   - Punto se mueve al vender
   - Debajo: cantidades concretas

4. Producto — campo "Restockeable" (checkbox)
   - Si NO → oculta botón "📦 Reabastecer"
   - Para cosas únicas (ropa, cartas, piezas)

5. Nueva pestaña Proveedores
   - Datos: nombre, tienda, teléfono, dirección, notas
   - Selector al comprar/restockear (obligatorio en restock)
   - Detalle: datos + productos + precios + comparativa
   - Botón "Pedir por WhatsApp" con productos seleccionados
   - Requiere campo "país" para código WhatsApp
   - Link: https://wa.me/<numero>?text=<mensaje>

6. Flujo Restock con proveedores ✅ APROBADO
   - Lista proveedores que venden ese producto
   - Precios + comparativa
   - Al tocar → sus datos (teléfono, dirección)
   - Botón "Saltar" si no asigna
   - Guarda proveedorId en cada lote

7. Pestaña Pedidos — COMPLETA
   - Cliente OBLIGATORIO (crear si no existe)
   - Selección de productos con stock disponible
   - Carrito múltiple o único
   - Botón "Cerrar pedido"
   - Al cerrar → aparece en lista de pedidos
   - Lista: activos (rojo arriba) + cerrados (verde abajo)

8. Sistema 3 checks por pedido:
   ☐ Pagado → adjuntar comprobante (texto/imagen/efectivo)
   ☐ Enviado → check simple
   ☐ Entregado → check simple
   - Al tener los 3 → pide confirmación
   - Al confirmar → cierra y descuenta stock

9. Compartir factura pedido por WhatsApp
   - PNG al cliente seleccionado

10. ⚠️ CRÍTICO: Bloqueo de stock en pedidos activos
    - Pedido activo = cantidades reservadas
    - NO descuenta stock real
    - NO se puede vender lo reservado
    - SÍ descuenta al cerrar pedido
    - calc() debe restar reservas activas
    - Vender y Pedidos respetan stock disponible

11. Pedidos ligados al cliente ✅ CONFIRMADO
    - Cliente obligatorio
    - Botón "Cerrar pedido" deshabilitado sin cliente
    - Se puede crear cliente inline sin salir
    - En ficha cliente: nueva sección "Pedidos"

12. Decidir nav con 8 pestañas (Clientes + Proveedores)
    - Opción A: scrollable con 8
    - Opción B: agrupar Clientes+Proveedores+Pedidos

=== MODELO DE DATOS ACTUAL v7 ===

DB.products: [{id, nombre, fotos[], fotoPrincipal,
  tipoMargen, valorMargen, codigoBarras, favorito,
  creado, lotes[], ventas[]}]

DB.tickets: [{id, numero, fecha, clienteId,
  clienteNombre, items[], total, ganancia,
  tasaSnapshot, refCurrencySnapshot}]

DB.clients: [{id, nombre, cedula, telefono,
  notas, creado}]

DB.settings: {currency, refCurrency, tasaDia,
  tasaActualizada, business{nombre,rif,telefono,direccion}}

DB.ventaCounter: {'2026-09-16': N}

SESSION (Invertir):
{activa, capitalInicial, productos[], creada}

CARRITO:
{items: [{productoId, cantidad, precioUnitario}]}

=== PENDIENTE POST-URGENTE ===

- Exportar CSV/PDF
- Productos por peso (kg, g, L, ml)
- Estadísticas sub-tabs
- Pestaña Pedidos completa
- Notificaciones stock bajo
- Borrar fondo fotos
- Logo + iconos APK
- Firma keystore
- Fix vibración MainActivity.java
- Compilar APK

=== ESTILO DE TRABAJO ===

- Trabajo desde Android con Gboard (límite caracteres)
- Dividir códigos en partes
- Siempre códigos COMPLETOS
- Usar Eruda para debug
- Cerrar Chrome completo al recargar (SW)
- Los archivos viejos se borran cuando todo funcione
- Antes de subir GitHub, avisa
- Hacer backup antes de tandas grandes
- Máximo 500 líneas por archivo

=== LENGUAJE DE TRABAJO ===
Español (Venezuela)


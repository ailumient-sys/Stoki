## 2026-09-19 — Verificación plugin OCR

- Agregado `@capacitor-community/image-to-text@^6.0.1` en dependencies
- Build de verificación: confirma que `npx cap sync` incluye el plugin en el APK
- Sin cambios visibles en la app (el plugin aún no se usa desde el código)

# Changelog

Todos los cambios importantes de Stoki, ordenados por versión.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

---

## [v15] — 19/09/2026

Versión mayor con sistema de tipos de ítem y varias features nuevas.

### Tipos de ítem
- 🟢 **Producto** — compra y reventa directa
- 🔵 **Material** — insumo (con unidad: g, kg, ml, l, m, cm)
- 🟣 **Receta** — combina materiales, con sub-recetas (1 nivel)
- 🔴 **Servicio** — trabajo/tiempo, con consumibles opcionales

### Agregado
- Form unificado con selector de tipo (Opción C)
- Motor `calc()` con 4 ramas + explosión de componentes
- Pestañas por tipo en Inventario
- Cards con badge de tipo en Vender
- Carrito fraccionado (kg/g/m) con modal de cantidad
- Detalle diferente por tipo (termómetro solo en productos)
- Reserva de materiales al hacer pedidos con recetas
- Restock separado en menú Más con filtro y proveedor
- Citas como pestaña dentro de Pedidos
- Tickets y facturas con formato de unidad fraccionada
- Cierre diario con desglose por tipo
- Movimientos (propinas/mermas) con cantidad
- Libro contable PDF con movimientos y resultado del día
- Catálogo PDF con servicios y precio por kg
- Estadísticas con filtro por tipo + "Rentabilidad por tipo"
- Búsqueda global con emoji de tipo
- Onboarding completo (8 slides + saltar)
- Ayuda con secciones "Tipos de ítem" y "Propinas y pérdidas"
- Exportar lista de compras (PDF con casillas)
- Historial de precios de materiales
- Historial de cierres con agrupación por mes
- Mini-modal del cierre (hoy / historial)
- Botón "Nuevo cliente" en pestaña Clientes

### Cambiado
- Márgenes simplificados a 4 tipos: % × unidad, $ × unidad, $ × lote, precio fijo
- "Unidades compradas" → "Stock" en formularios
- Restock se movió a módulo independiente
- Selector de tipo en lugar de tabs en formularios
- Auto-open de overlays con MutationObserver (previene bug recurrente)

### Eliminado
- Campo "restockeable" (reemplazado por lógica de tipos)
- Formatos de margen viejos (porcentaje, fijo, precio)

### Notas
- Migración automática v14 → v15 (productos existentes → tipo 'producto')
- Backup v15 renombrado como 'backup-completo-v15'
- Totalmente compatible con backups pre-v15

---

## [v74] — 19/09/2026

### Corregido
- Moneda principal igual a referencia → no mostrar dual duplicado
- Auto-ajuste de moneda de referencia al cambiar principal
- Ocultar moneda principal del selector de referencia en modal de tasa

---

## [v73] — 18/09/2026

### Agregado
- Sistema de licencias offline (trial 7 días + HMAC-SHA256)
- Pantalla de activación con Device ID copiable
- Pantalla de bloqueo con export permitido
- Libro contable real (PDF) con número de registro y firma
- Stock restante visible en cierre diario
- Número de registro por fecha (YYYYMMDD)
- Tooltip de aviso al cambiar stock manual
- Auto-conversión de unidades y redondeo configurable

### Cambiado
- Cierre diario ahora muestra desglose y análisis completo
- PDF de cierre tiene formato simple o libro contable

---

## [v72] — 18/09/2026

### Agregado
- Check "💳 Débito" en venta y en pedidos
- Sistema de roles internos (base para futuro)

### Cambiado
- Modal de comprobante ahora tiene 4 tipos (efectivo, débito, pago móvil, texto, imagen)

---

## [v71] — 18/09/2026

### Agregado
- Cierre diario con exportar a PDF (simple / avanzado)
- Sección "movimientos" (base)

---

## [v70] — 18/09/2026

### Agregado
- Cierre diario en menú Más
- Registro numerado por fecha

---

## [v69] — 18/09/2026

### Corregido
- Filtro de Inventario no abría (faltaba clase `.open` en el modal)

---

## [v68] — 18/09/2026

### Agregado
- Badge vivo en pestaña Vender (se actualiza al agregar/quitar)
- Botón FAB movible (drag para reposicionar)

### Corregido
- Badge no se actualizaba al quitar del carrito
- Badge no se actualizaba al cerrar venta
- FAB desaparecía al arrastrarlo fuera del área

---

## [v67] — 18/09/2026

### Corregido
- Menú Más no scrolleable en pantallas con muchas opciones
- Nav rígido en pantallas chicas
- SW no recacheaba tras cambios de CSS

---

## [v66] — 18/09/2026

### Corregido
- `buildThumb` faltante (congelaba carrito, pedidos, facturas, proveedores)
- Backup accesible desde menú Más (además del logo)
- `renderProductos` sin try/catch
- `calc.js` sin Array.isArray

---

## [v65] — 18/09/2026

### Corregido
- Bloque huérfano de Eruda en `index.html`
- `capacitor-native-settings` sin usar en `package.json`
- Texto de ayuda "2 toques" → "3 toques"
- SW desactualizado + faltaba `exporter.js` en caché
- Logo disparaba `click` + `touchend` (contaba doble)
- `categoriaNombre` no definido en header compacto del PDF
- Código muerto `vCard` en `app.js`

---

## [v64 y anteriores] — Histórico

### Core
- FIFO real con reservas de pedidos
- Multi-moneda con snapshot por venta
- Termómetro bipolar (perdiendo/ganando)
- 5 tipos de precio: % / $unidad / $lote / 💵unidad / 💵lote

### Inventario
- Fotos en IndexedDB (hasta 6 por producto)
- Categorías con emojis + agrupación colapsable
- Favoritos, búsqueda sin tildes, escáner de código de barras
- Alertas de stock con colores
- Quick Add (botón ⚡)

### Vender
- Grid denso con columnas ajustables (3-6)
- Toque directo en producto = +1 al carrito
- FAB con contador y monto
- Escáner integrado

### Pedidos
- 3 checks: pagado, enviado, entregado
- Comprobantes con imágenes en IndexedDB
- Reserva automática de stock
- Compartir por WhatsApp

### Clientes y Proveedores
- Datos completos + historial
- Anclar productos a proveedores con precio
- Mejor precio histórico

### Exportación
- Modal unificado (catálogo / inventario / ambos)
- 6 productos por página en catálogo
- Imagen de fondo con logo
- Compartir a WhatsApp / Drive

### Invertir
- Planificador con capital
- Simulador con 6 márgenes rápidos
- Historial de compras

### Compras
- Calculadora standalone
- Marcar comprado → resta del pendiente
- Modal de cuotas

### Extras
- Búsqueda global
- Sistema de ayuda (10 secciones)
- Apariencia personalizable (9 gradientes + imágenes + slider opacidad)
- Panel backup (3 toques en logo)
- Onboarding 3 slides
- Modo offline completo
- Multi-moneda con snapshot

---

## Formato de versiones

- **v0-v14**: desarrollo inicial
- **v15**: tipos de producto (en curso)
- **v65+**: correcciones y features grandes

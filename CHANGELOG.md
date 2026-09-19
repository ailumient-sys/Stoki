# Changelog

Todos los cambios importantes de Stoki, ordenados por versión.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

---

## [v15] — En desarrollo

### Fase 0 — Core (COMPLETA)
- `js/core/types.js` — constantes de tipos, unidades, márgenes
- `js/calc.js` — motor con 4 ramas (producto, material, receta, servicio)
- Explosión de componentes y sub-recetas
- `js/core/storage.js` — migración v14 → v15
- Campo `movimientos` en DB
- Compatibilidad total con productos existentes

### Pendiente
- Fase 1: Formularios por tipo
- Fase 2: Vistas de uso
- Fase 3: Pedidos, citas, restock
- Fase 4: Documentos
- Fase 5: Transversal
- Fase 6: Pulido

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

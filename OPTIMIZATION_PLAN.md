
# Plan de Optimización de Rendimiento e Integridad de Datos

Este documento detalla el plan para solucionar problemas críticos de rendimiento (N+1 queries), integridad de datos (condiciones de carrera) y duplicación de código en el sistema CRM.

## Prioridad 1: Integridad de Datos y Atomicidad (Crítico)
**Problema**: Actualmente, la creación de facturas y la actualización de inventario ocurren en operaciones separadas. Si la actualización de inventario falla después de crear la factura, los datos quedan inconsistentes. Si dos usuarios compran el último ítem al mismo tiempo, el stock podría quedar negativo.
**Solución**: Implementar **Transacciones de MongoDB (ACID)**. Esto asegura que todas las operaciones (guardar factura, actualizar stock, guardar historial) se completen exitosamente o se reviertan totalmente.

## Prioridad 2: Rendimiento del Backend (Alto)
**Problema**: El sistema utiliza bucles `for` con `await` para actualizar el stock ítem por ítem (`ProductModel.findByIdAndUpdate`).
- Si una factura tiene 20 ítems, se realizan 20 llamadas a la base de datos secuencialmente.
**Solución**: Utilizar `bulkWrite` de MongoDB.
- Esto envía TODAS las actualizaciones de stock en una sola operación a la base de datos, reduciendo drásticamente la latencia.

## Prioridad 3: Refactorización y DRY (Mantenibilidad)
**Problema**: La lógica de "validar stock" y "actualizar stock" está copiada y pegada en múltiples funciones (`createInvoice`, `updateInvoice`, `deleteInvoice`, `createCreditNote`, etc.).
**Solución**: Centralizar la lógica de inventario en funciones reutilizables.

---

## Ejecución del Plan

### Paso 1: Crear Utilidades de Inventario
Crear un archivo `src/lib/inventoryUtils.ts` para centralizar las operaciones de stock masivas.

### Paso 2: Optimizar `invoiceActions.ts`
Refactorizar las siguientes funciones para usar Transacciones y `bulkWrite`:
- `createInvoice`
- `updateInvoice`
- `deleteInvoice`

### Paso 3: Optimizar `paymentActions.ts` (Notas de Crédito)
Refactorizar las siguientes funciones para usar Transacciones y `bulkWrite`:
- `createCreditNote`
- `updateCreditNote`
- `deleteCreditNote`

---

## Verificación
Se realizará una verificación manual (simulación) para asegurar:
1. Las facturas se crean correctamente.
2. El stock se descuenta correctamente.
3. El rendimiento es óptimo (código más limpio y rápido).

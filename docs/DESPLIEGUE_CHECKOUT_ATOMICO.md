# Despliegue del checkout atómico

La migración `20260722090000_janastudio_atomic_checkout.sql` fue aplicada al VPS el 22 de julio de 2026, exclusivamente en el esquema `janastudio`.

## Validación realizada el 22 de julio de 2026

- Claves de idempotencia duplicadas: `0`.
- Sesiones de paquete duplicadas por cita: `0`.
- Recetas sin producto de inventario: `0`.
- Productos con stock negativo: `0`.
- Transacciones sin clave de idempotencia: `0`.
- Se creó y validó el respaldo `janastudio_before_atomic_checkout_20260722_165820.dump` antes de aplicar cambios.
- La migración completa compiló contra el esquema real con `ON_ERROR_STOP`, `lock_timeout = 3s` y final obligatorio en `ROLLBACK`.
- La prueba funcional con reversión verificó: primera escritura, replay idempotente, descuento de inventario una sola vez y finalización de la cita.
- La instalación permanente terminó en `COMMIT`; la función es `SECURITY DEFINER`, pertenece a `postgres` y solo `authenticated` posee permiso de ejecución.

## Alcance

Una única transacción PostgreSQL realiza:

- reclamación de la clave de idempotencia;
- creación del ingreso con tasa histórica;
- finalización de citas y servicios añadidos;
- persistencia de comisiones y propinas;
- descuento de productos vendidos;
- descuento de recetas de servicios;
- creación y consumo de paquetes;
- creación de planes financiados y primera cuota.

Un fallo revierte toda la operación. Un reintento con la misma clave devuelve la transacción existente y no repite inventario, sesiones ni ingresos.

## Preflight de solo lectura

Ejecutar primero y guardar los resultados:

```sql
select idempotency_key, count(*)
from janastudio.transactions
where idempotency_key is not null
group by idempotency_key
having count(*) > 1;

select client_package_id, appointment_id, count(*)
from janastudio.package_sessions
where appointment_id is not null
group by client_package_id, appointment_id
having count(*) > 1;

select count(*) as recipes_without_inventory
from janastudio.service_costs
where inventory_item_id is null;

select count(*) as negative_stock_items
from janastudio.inventory
where stock < 0;
```

Los dos primeros resultados deben estar vacíos antes de crear los índices únicos. Los dos últimos se documentan para reconciliación, pero no bloquean la instalación.

## Secuencia segura

1. Obtener respaldo lógico del esquema `janastudio` y comprobar que el archivo no esté vacío.
2. Ejecutar las consultas preflight.
3. Aplicar únicamente `20260722090000_janastudio_atomic_checkout.sql`.
4. Confirmar que la función pertenece a `janastudio` y que solo `authenticated` puede ejecutarla.
5. Probar un cobro controlado con un producto y un servicio de receta conocida.
6. Repetir exactamente la misma solicitud y verificar que indique `replayed: true`.
7. Confirmar una sola transacción, un solo movimiento por consumo y un solo descuento de stock.
8. Desplegar el frontend después de aprobar la prueba.

## Reconciliación posterior

```sql
select id, idempotency_key, amount, exchange_rate, created_at
from janastudio.transactions
where idempotency_key = '<UUID-DE-PRUEBA>';

select product_id, type, amount, reason, created_at
from janastudio.inventory_movements
where reason like '%<UUID-DE-TRANSACCION>%'
   or reason like 'Venta POS - Cliente:%'
order by created_at;

select id, status, completed_at, exchange_rate
from janastudio.appointments
where id in ('<UUID-CITA>');
```

## Reversión

Si la función no supera la prueba, no desplegar el frontend. La versión anterior del frontend no la invoca, por lo que puede mantenerse operativa mientras se corrige la función. No eliminar transacciones ni movimientos de inventario manualmente sin una conciliación específica.

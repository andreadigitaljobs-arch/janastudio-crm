# Requisitos operativos de JanaStudio

Fuente: conversación, audios transcritos y capturas entregadas por la clienta en julio de 2026. Este documento separa lo solicitado de lo que todavía debe verificarse en producción.

## Principios del producto

- El sistema es una herramienta interna. La clienta final no agenda ni opera directamente el CRM.
- La agenda debe ser rápida y visual; no debe depender de una conversación con IA.
- Los precios se definen en USD y el cobro se convierte automáticamente a la tasa BCV vigente, conservando la tasa histórica de la operación.
- Un servicio solo debe afectar ingresos, comisiones e inventario cuando haya sido efectivamente realizado/cobrado.

## Agenda y recepción

- Mostrar en un mismo tablero el día completo y todas las especialistas, con duración real de cada servicio.
- Permitir que una clienta tenga servicios simultáneos o consecutivos con especialistas diferentes.
- Permitir ajustes de duración por clienta o cita.
- Registrar retrasos y reorganizar visualmente la agenda sin perder el historial.
- Cuando la clienta agregue un servicio estando en el local, incorporarlo a la cita/visita del día y no registrarlo únicamente como movimiento financiero.
- Conservar el historial completo de servicios realizados para futuras visitas.

## Inventario, recetas y rentabilidad

- Asociar cada servicio con su receta de insumos y consumo estimado.
- Descontar la receta al completar/cobrar el servicio.
- Permitir consumos fraccionarios o reutilizables; por ejemplo, un palito u hojilla utilizado para tres clientas equivale a 1/3 por servicio.
- Identificar la ubicación del inventario: estudio o casa.
- Alertar reposición y registrar cuándo se termina o reemplaza un envase/lote.
- Informar cuántos servicios produjo cada envase y comparar su rendimiento esperado con el real.
- Calcular rentabilidad por servicio, categoría e insumo.

## Depilación láser

- Manejar modalidades de una, cuatro u ocho sesiones.
- Para paquetes de ocho sesiones, permitir tres pagos en las tres primeras visitas: 30%, 40% y 30%, separadas normalmente por 21 días.
- Distribución económica solicitada: 30% especialista, 40% socia/proveedora de insumos y 30% estudio.
- Registrar los insumos aportados por la socia dentro de su 40% para medir su costo y rentabilidad.
- Mostrar sesiones usadas/restantes, pagos pendientes, próxima visita y fotos de antes/después.
- Los paquetes vencen diez meses después de su compra; alertar antes del vencimiento y marcar las sesiones no utilizadas como vencidas.
- Reflejar las cuotas pendientes como cuentas por cobrar.

## Catálogo recibido

- Se recibieron precios, duraciones y recetas parciales de uñas, pedicura, cejas, cera y lifting de pestañas.
- Las migraciones `20260719010000_register_brows_services_and_costs.sql` y `20260721000000_register_nails_services.sql` cubren buena parte de esas capturas.
- Las cantidades por servicio son estimaciones operativas y deben ser validadas por la clienta antes de considerarse costos definitivos.

## Criterios de aceptación prioritarios

1. Un servicio añadido en recepción queda enlazado con la visita, la especialista, la transacción y el historial de la clienta.
2. Dos servicios simultáneos con especialistas distintas se muestran sin falsos conflictos.
3. Completar un servicio descuenta cada insumo exactamente una vez, incluso si se reabre la pantalla o se pierde conexión.
4. Un paquete láser muestra correctamente sesiones, cuotas, distribución 30/40/30 y vencimiento.
5. Todo movimiento monetario conserva monto USD, monto Bs. y tasa histórica utilizada.

## Pendiente de confirmación con la clienta

- Cantidades y costos unitarios definitivos de cada receta.
- Política exacta al llegar tarde o reprogramar una sesión láser.
- Momento de reconocimiento de la comisión: al cobrar la primera cuota o al completar la sesión.
- Anticipación de las alertas de vencimiento de paquetes.
- Permisos concretos para editar costos, recetas y ajustes de inventario.

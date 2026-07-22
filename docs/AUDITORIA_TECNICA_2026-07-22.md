# Auditoría técnica — 22 de julio de 2026

## Estado verificado

- El repositorio inició limpio y sincronizado con `origin/master`.
- El build de producción finaliza correctamente.
- ESLint 9 ya tiene configuración flat y el comando `npm run lint` vuelve a funcionar.
- Existe una primera suite de reglas del negocio con cuatro pruebas y todas pasan.
- Dashboard, agenda, clientes y caja usan carga diferida.
- El JavaScript principal bajó aproximadamente de 1126 kB a 430 kB sin comprimir; los módulos grandes ahora tienen chunks independientes.

## Hallazgos críticos

### 1. Credencial administrativa expuesta

Una clave `service_role` estuvo incrustada en un archivo versionado. Fue retirada del código actual, pero permanece en el historial de Git. Debe rotarse en Supabase y comprobarse su revocación.

### 2. Contraseña persistida en el navegador

El login incluía un acceso oculto que guardaba correo y contraseña en `localStorage`. El mecanismo fue eliminado. La sesión debe depender exclusivamente del cliente de autenticación de Supabase.

### 3. Línea de migraciones inconsistente

Hay migraciones antiguas dirigidas a `public` y nuevas dirigidas a `janastudio`; además existen scripts manuales para desactivar RLS. Antes de aplicar nuevas migraciones se necesita obtener el esquema real de producción y crear una línea base verificable.

## Deuda estructural

- `ClientModule.jsx`, `SchedulingModule.jsx`, `FinanceModule.jsx` y `CheckoutPOS.jsx` concentran demasiadas responsabilidades.
- `dataService.js` combina consultas de múltiples dominios, caché, normalización y efectos secundarios.
- `index.css` concentra estilos globales y específicos de módulos.
- Las rutas económicas todavía necesitan pruebas de integración para idempotencia, pagos mixtos, tasas históricas, comisiones e inventario.

## Orden seguro de refactorización

1. Extraer reglas puras y probarlas antes de mover interfaces.
2. Separar `dataService` por dominio manteniendo temporalmente una fachada compatible.
3. Extraer secciones internas de `CheckoutPOS` sin cambiar el contrato del componente.
4. Separar cálculos y presentación de `SchedulingModule`.
5. Separar ficha, historial y formularios de `ClientModule`.
6. Mover estilos por módulo solo después de que existan pruebas de flujo.

## Verificaciones obligatorias por etapa

- `npm test`
- `npm run lint`
- `npm run build`
- Prueba manual de inicio de sesión, agenda, servicio añadido, cobro, comisión e inventario.
- Para cambios SQL: respaldo, ensayo en entorno no productivo, revisión del diff de esquema y consulta de reconciliación posterior.

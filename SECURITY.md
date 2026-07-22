# Seguridad de JanaStudio

## Estado verificado el 22 de julio de 2026

- Una clave `service_role` anterior permanece en el historial de Git, pero se comprobó que ya no es aceptada por el servidor (`HTTP 401`).
- Los scripts actuales ya no contienen claves: las leen únicamente desde variables de entorno.
- El bypass de inicio de sesión y el almacenamiento local de contraseñas fueron eliminados.
- Si vuelve a aparecer una credencial activa en Git, debe rotarse inmediatamente y verificarse su revocación.

## Reglas

- Las claves `service_role` nunca deben tener prefijo `VITE_`: Vite expone esas variables al navegador.
- La clave anónima puede estar en el cliente, pero debe depender de RLS correctamente configurado y no debe copiarse innecesariamente a la documentación.
- No guardar contraseñas en `localStorage`, `sessionStorage`, archivos de respaldo o documentación.
- Los scripts administrativos deben leer secretos desde variables de entorno y fallar si no existen.
- `.env` y `.env.*.local` permanecen fuera de Git.
- Antes de publicar, ejecutar una búsqueda de secretos y revisar cualquier JWT, contraseña, IP administrativa o ruta de llave SSH encontrada.

## Migraciones

El proyecto contiene migraciones históricas para `public` y migraciones nuevas para `janastudio`. No se debe ejecutar el directorio completo contra producción hasta crear y validar una línea base canónica del esquema activo.

Los archivos `disable_rls_for_import.sql` y `re_enable_rls.sql` son herramientas operativas peligrosas. Solo deben ejecutarse dentro de una ventana controlada, con respaldo, destino verificado y comprobación posterior de RLS.

## Respuesta ante exposición

Eliminar una clave del código no es suficiente. Se debe rotar en el proveedor, actualizar los consumidores autorizados, revisar registros y confirmar que la clave anterior dejó de funcionar.

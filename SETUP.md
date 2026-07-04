# JanaStudio CRM - Instrucciones de Configuración

## 1. Variables de Entorno (`.env`)

El archivo `.env` ya está configurado con tus credenciales de Supabase:

```
VITE_SUPABASE_URL=https://supabase.somosdostudio.com
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 2. Base de Datos

### Opción A: Usar SSH para ejecutar SQL

```bash
# Conectar a tu VPS
ssh root@62.171.160.75
# Contraseña: Andreita1606

# Acceder a PostgreSQL
docker exec -it supabase-db psql -U postgres

# Crear el esquema y ejecutar el SQL
\i /ruta/a/00_full_schema.sql
\i /ruta/a/01_seed_data.sql
```

### Opción B: Usar el SQL Editor de Supabase Studio

1. Ve a `http://62.171.160.75:3000` (Supabase Studio)
2. Inicia sesión con tus credenciales
3. Ve a SQL Editor
4. Copia y pega el contenido de `supabase/00_full_schema.sql`
5. Ejecuta
6. Repite con `supabase/01_seed_data.sql`

### Opción C: Copiar archivos al VPS

```bash
# Copiar los archivos SQL a tu VPS
scp supabase/*.sql root@62.171.160.75:/tmp/

# Conectar y ejecutar
ssh root@62.171.160.75
docker cp /tmp/00_full_schema.sql supabase-db:/tmp/
docker cp /tmp/01_seed_data.sql supabase-db:/tmp/
docker exec -it supabase-db psql -U postgres -f /tmp/00_full_schema.sql
docker exec -it supabase-db psql -U postgres -f /tmp/01_seed_data.sql
```

## 3. Ejecutar el Proyecto

```bash
cd C:\Users\Waiha\JanaStudio
npm install
npm run dev
```

## 4. Credenciales de Acceso

Después de ejecutar el SQL, necesitarás crear un usuario de prueba en `auth.users` de Supabase y luego crear un registro en `janastudio.staff` con ese `auth_user_id`.

## 5. Deploy a Vercel

```bash
npm run build
vercel --prod
```

## Notas Importantes

- El esquema se llama `janastudio` (multi-tenant)
- Solo el rol `admin` y `reception` pueden agendar citas
- Las trabajadoras solo ven su agenda del día
- El módulo de costeo está disponible solo para admin

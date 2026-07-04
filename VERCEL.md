# Deploy a Vercel - JanaStudio CRM

## Pasos para conectar el repositorio

### 1. Ir a Vercel
Ve a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.

### 2. Importar Proyecto
- Haz clic en "Add New..." → "Project"
- Selecciona el repositorio `janastudio-crm`
- Vercel detectará automáticamente que es un proyecto Vite/React

### 3. Configurar Variables de Entorno
En la configuración del proyecto, agrega estas variables de entorno:

```
VITE_SUPABASE_URL=https://supabase.somosdostudio.com
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhoa2VhZ3VhbXl6aWFtcGp2d2NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NTE1NjksImV4cCI6MjA5ODQyNzU2OX0.lQZaObcqLD7ArEorV5klcxB4Zyjcv8YY6HjHu2YKrjs
VITE_APP_NAME=JanaStudio
```

### 4. Build Settings
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### 5. Deploy
Haz clic en "Deploy" y espera a que termine.

## URL del Proyecto
Después del deploy, tu proyecto estará disponible en:
`https://janastudio-crm.vercel.app`

## Actualizaciones Futuras
Cada vez que hagas push a la rama `main`, Vercel desplegará automáticamente los cambios.

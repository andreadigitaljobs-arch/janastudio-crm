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
VITE_SUPABASE_ANON_KEY=tu-clave-anonima
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
Cada vez que hagas push a la rama `master`, Vercel desplegará automáticamente los cambios.

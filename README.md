# JanaStudio CRM

Sistema de gestión para salón de belleza - Uñas, Pestañas y Alisado

## Características

- **Dashboard** - Métricas generales del salón
- **Agenda** - Gestión de citas (solo recepción puede agendar)
- **Recepción** - Registro y cobro de servicios
- **Clientes** - Base de datos de clientes
- **Servicios** - Catálogo de servicios
- **Costeo** - Análisis de rentabilidad por servicio
- **Equipo** - Gestión de trabajadoras
- **Inventario** - Control de productos
- **Finanzas** - Ingresos y gastos

## Roles del Sistema

- **Admin** - Acceso total
- **Recepción/Caja** - Agenda y cobra servicios
- **Trabajadora** - Solo ve su agenda del día

## Configuración

### 1. Base de Datos

Ejecuta en orden los archivos SQL en tu instancia de Supabase:

```sql
-- 1. Schema completo
\i supabase/00_full_schema.sql

-- 2. Datos de demo (opcional)
\i supabase/01_seed_data.sql
```

### 2. Variables de Entorno

Copia `.env.example` a `.env` y completa:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Instalación

```bash
npm install
npm run dev
```

### 4. Deploy a Vercel

```bash
npm run build
vercel --prod
```

## Estructura del Proyecto

```
JanaStudio/
├── src/
│   ├── components/
│   │   ├── Login.jsx          # Login con tema rosado
│   │   ├── Sidebar.jsx        # Navegación lateral
│   │   ├── DashboardModule.jsx # Panel principal
│   │   ├── CostingModule.jsx   # Análisis de costos
│   │   ├── ClientModule.jsx    # Gestión de clientes
│   │   ├── ServicesModule.jsx  # Catálogo de servicios
│   │   ├── InventoryModule.jsx # Inventario
│   │   └── ...
│   ├── services/
│   │   └── dataService.js      # Conexión con Supabase
│   ├── utils/
│   │   └── roles.js            # Control de acceso
│   └── index.css               # Estilos (tema rosado/violeta)
├── supabase/
│   ├── 00_full_schema.sql      # Esquema de base de datos
│   └── 01_seed_data.sql        # Datos de demo
└── package.json
```

## Diseño

Tema rosado/violeta inspirado en Victoria's Secret con:

- Colores principales: `#d946a8` (rosado), `#8b5cf6` (violeta)
- Fondo oscuro con gradientes sutiles
- Efectos glass en las tarjetas
- Animaciones suaves

## Desarrollado por

JanaStudio - Soluciones Tecnológicas

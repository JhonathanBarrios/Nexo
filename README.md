# App Gastos

PWA de finanzas personales para gestionar gastos, ingresos y pagos recurrentes.

## 🚀 Stack Tecnológico

- **Frontend**: React 19 + TypeScript + Vite 8
- **Estilos**: Tailwind CSS v4
- **Estado**: Zustand
- **Base de datos**: Supabase (PostgreSQL)
- **PWA**: Vite PWA Plugin
- **Gráficos**: Recharts
- **Animaciones**: Framer Motion
- **Enrutamiento**: React Router v7

## ✨ Características

- 📊 Dashboard con resumen financiero
- 💳 Registro de transacciones (ingresos/gastos)
- 🔄 Pagos recurrentes automáticos
- 📈 Análisis y gráficos de gastos
- 📱 Progressive Web App (instalable)
- 🌓 Modo oscuro
- 🔐 Autenticación con Supabase

## 📦 Instalación

```bash
npm install
```

## 🔑 Variables de Entorno

Copia `.env.example` a `.env` y configura:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Obtén las credenciales en [Supabase Dashboard](https://supabase.com/dashboard).

## 🗄️ Base de Datos

Ejecuta las migraciones en Supabase:

1. Ve al SQL Editor en Supabase Dashboard
2. Ejecuta los archivos en `migrations/` en orden:
   - `20260430000001_initial_schema.sql`
   - `20260430000002_default_categories_trigger.sql`
   - `20260430000003_auth_users_sync.sql`
   - `20260430000004_sync_existing_users.sql`
   - `20260501000001_recurring_payments.sql`

## 🏃 Scripts

```bash
npm run dev          # Servidor de desarrollo (http://localhost:5173)
npm run build        # Build para producción
npm run lint         # ESLint
npm run preview      # Previsualizar build de producción
```

## 🚀 Despliegue

### Vercel

1. Conecta este repo a Vercel
2. Configura las variables de entorno en Vercel Dashboard
3. Deploy automático en cada push a main

### Netlify

1. Conecta repo a Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Configura variables de entorno

## 📝 Licencia

MIT

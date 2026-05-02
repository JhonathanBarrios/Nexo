# Budget Alerts Edge Function

Esta Edge Function verifica los gastos vs presupuestos y envía notificaciones push cuando se alcanzan los umbrales configurados (50%, 80%, 100%).

## Despliegue

### 1. Instalar Supabase CLI

```bash
npm install -g supabase
```

### 2. Login en Supabase

```bash
supabase login
```

### 3. Vincular al proyecto

```bash
supabase link --project-ref mghqeczlnwjkkjhcvgwk
```

### 4. Desplegar la Edge Function

```bash
supabase functions deploy check-budget-alerts
```

### 5. Configurar variables de entorno

La Edge Function necesita estas variables de entorno (se configuran automáticamente en Supabase):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Ejecución Manual

Para probar manualmente:

```bash
supabase functions invoke check-budget-alerts
```

## Configurar Cron Job

### Opción 1: GitHub Actions (recomendado)

Crea un workflow en `.github/workflows/budget-alerts.yml`:

```yaml
name: Budget Alerts
on:
  schedule:
    - cron: '0 */6 * * *' # Cada 6 horas
  workflow_dispatch:

jobs:
  check-budgets:
    runs-on: ubuntu-latest
    steps:
      - name: Invoke Edge Function
        run: |
          curl -X POST https://mghqeczlnwjkkjhcvgwk.supabase.co/functions/v1/check-budget-alerts \
            -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Opción 2: pg_cron en Supabase

Ejecuta este SQL en Supabase SQL Editor:

```sql
-- Habilitar pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear job para ejecutar cada 6 horas
SELECT cron.schedule(
  'check-budget-alerts',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mghqeczlnwjkkjhcvgwk.supabase.co/functions/v1/check-budget-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

## Funcionalidad

La función:
1. Obtiene todos los usuarios con alertas de presupuesto habilitadas
2. Verifica los presupuestos del mes actual
3. Calcula el porcentaje gastado
4. Envía notificaciones push cuando se alcanza:
   - 50% del presupuesto
   - 80% del presupuesto
   - 100% del presupuesto
5. Usa Supabase Realtime para enviar notificaciones en tiempo real

## Frontend

El hook `useRealtimeNotifications` en el frontend escucha las notificaciones push y muestra alertas del navegador cuando se reciben.

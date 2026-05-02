-- Test notification - Simula una alerta de presupuesto
-- Esto enviará una notificación push al usuario actual para probar el banner

-- Primero, obtén tu user_id ejecutando:
-- SELECT id FROM auth.users WHERE email = 'tu@email.com';

-- Reemplaza TU_USER_ID abajo con tu user_id real

-- Insertar una notificación de prueba
INSERT INTO public.user_notifications (user_id, message, type, threshold, read, created_at)
VALUES (
  'c3664607-76d2-4b14-ae7b-52f5cb258124', -- Reemplaza con tu user_id real
  'Has gastado el 50% de tu presupuesto ($500 de $1000) - PRUEBA',
  'budget_alert',
  50,
  false,
  NOW()
);

-- Enviar notificación via Realtime (esto requiere que el Edge Function esté desplegada)
-- Nota: Para que el banner aparezca, la app debe estar abierta y conectada a Realtime
-- El banner aparecerá automáticamente cuando la app reciba la notificación

-- Para limpiar después de la prueba:
-- DELETE FROM public.user_notifications WHERE message LIKE '%PRUEBA%';

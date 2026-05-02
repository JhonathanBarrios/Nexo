-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create scheduled job to check budget alerts every 6 hours
-- This will invoke the Edge Function that checks budgets and sends notifications
-- Replace YOUR_SERVICE_ROLE_KEY with your actual service role key from Supabase

-- First, get your service role key from Supabase Dashboard > Settings > API > service_role (secret)
-- Then replace YOUR_SERVICE_ROLE_KEY below with the actual key

SELECT cron.schedule(
  'check-budget-alerts',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT net.http_post(
    url := 'https://mghqeczlnwjkkjhcvgwk.supabase.co/functions/v1/check-budget-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1naHFlY3psbndqa2tqaGN2Z3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU3OTg4OSwiZXhwIjoyMDkzMTU1ODg5fQ.UcgPj963CpD6XQlHuoav_OEvJZlx_rfK7kpp6LUPH-I',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Verify the job was created
SELECT * FROM cron.job WHERE jobname = 'check-budget-alerts';

-- To remove the job later:
-- SELECT cron.unschedule('check-budget-alerts');

-- To view all scheduled jobs:
-- SELECT * FROM cron.job;

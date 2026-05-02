-- Check ALL triggers on auth.users
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'auth' OR event_object_schema = 'auth';

-- Check ALL triggers on public.users
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- Check for any functions that reference users
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%users%'
  OR routine_definition LIKE '%auth%';

-- Find ALL references to categories.type in the database
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%categories%'
  AND routine_definition ILIKE '%type%';

-- Also check in pg_proc for more detailed function definitions
SELECT 
  proname,
  prosrc
FROM pg_proc
WHERE prosrc ILIKE '%categories%'
  AND prosrc ILIKE '%type%';

-- Check for any views that might reference categories.type
SELECT 
  viewname,
  definition
FROM pg_views
WHERE definition ILIKE '%categories%'
  AND definition ILIKE '%type%';

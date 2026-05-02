-- Check the current schema of categories table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'categories'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check the original migration to see what was expected
-- This should show what columns were created

-- Fix the insert_default_categories function to match actual schema
DROP TRIGGER IF EXISTS on_user_created_insert_categories ON auth.users;
DROP TRIGGER IF EXISTS on_user_insert_categories ON public.users;
DROP FUNCTION IF EXISTS public.insert_default_categories();

CREATE OR REPLACE FUNCTION public.insert_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, icon, color, budget_monthly)
  SELECT
    NEW.id,
    v.name,
    v.icon,
    v.color,
    NULL
  FROM (VALUES
    ('Alimentación', '🍔', '#ef4444'),
    ('Transporte', '🚗', '#f59e0b'),
    ('Servicios', '💡', '#22c55e'),
    ('Entretenimiento', '🎮', '#8b5cf6'),
    ('Salud', '💊', '#ec4899'),
    ('Educación', '📚', '#3b82f6'),
    ('Compras', '🛍️', '#f97316'),
    ('Otros', '📦', '#6b7280')
  ) AS v(name, icon, color)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.categories c
    WHERE c.user_id = NEW.id
      AND c.name = v.name
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if there's a trigger using this function and recreate it
DROP TRIGGER IF EXISTS on_user_insert_categories ON public.users;

-- Recreate trigger on auth.users
CREATE TRIGGER on_user_created_insert_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_default_categories();

-- Also recreate trigger on public.users
CREATE TRIGGER on_user_insert_categories
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_default_categories();

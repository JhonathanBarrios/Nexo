-- Reset database for clean signup
-- WARNING: This will delete ALL data but keep the schema

BEGIN;

-- 1) Delete all data (in correct order to respect foreign keys)
DELETE FROM public.transactions;
DELETE FROM public.budgets;
DELETE FROM public.user_notifications;
DELETE FROM public.user_settings;
DELETE FROM public.categories;
DELETE FROM public.users;

-- 2) Delete auth users (optional - only if you want to reset auth too)
-- Uncomment the line below if you want to delete all auth users
-- DELETE FROM auth.users WHERE email NOT IN ('jbarrioscamargo@gmail.com');

-- 3) Recreate functions and triggers with correct logic
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON public.users;
DROP TRIGGER IF EXISTS on_user_created_insert_categories ON auth.users;
DROP TRIGGER IF EXISTS on_user_insert_categories ON public.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.create_default_categories_for_user();
DROP FUNCTION IF EXISTS public.insert_default_categories();

-- 4) Recreate handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, password_hash)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Recreate insert_default_categories function (8 categories, NULL budget, Lucide icons, Tailwind gradients from UI)
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
    ('Alimentación', 'Utensils', 'from-blue-500 to-blue-600'),
    ('Transporte', 'Car', 'from-purple-500 to-purple-600'),
    ('Servicios', 'Zap', 'from-green-500 to-green-600'),
    ('Entretenimiento', 'Film', 'from-pink-500 to-pink-600'),
    ('Salud', 'Heart', 'from-red-500 to-red-600'),
    ('Educación', 'BookOpen', 'from-cyan-500 to-cyan-600'),
    ('Compras', 'ShoppingBag', 'from-orange-500 to-orange-600'),
    ('Otros', 'MoreHorizontal', 'from-slate-500 to-slate-600')
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

-- 6) Ensure RLS policies are correct
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Service role can insert users"
  ON public.users FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid()::uuid = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid()::uuid = id);

-- 7) Recreate triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_default_categories();

COMMIT;

-- Verify the reset
SELECT 'Database reset completed. Categories will be created with budget_monthly = NULL' as status;

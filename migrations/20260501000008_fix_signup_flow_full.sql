-- Full fix for Supabase signup flow
-- Root cause fixed: references to non-existent categories.type column

BEGIN;

-- 1) Remove possibly broken triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON public.users;

-- 2) Recreate function that syncs auth.users -> public.users
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

-- 3) Recreate default categories function (WITHOUT categories.type)
CREATE OR REPLACE FUNCTION public.create_default_categories_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, icon, color, budget_monthly)
  SELECT
    NEW.id,
    v.name,
    v.icon,
    v.color,
    v.budget_monthly
  FROM (VALUES
    ('Alimentación', 'Utensils', 'from-blue-500 to-blue-600', 500::numeric),
    ('Transporte', 'Car', 'from-purple-500 to-purple-600', 300::numeric),
    ('Vivienda', 'Home', 'from-pink-500 to-pink-600', 1000::numeric),
    ('Entretenimiento', 'Film', 'from-orange-500 to-orange-600', 200::numeric),
    ('Salud', 'Heart', 'from-red-500 to-red-600', 300::numeric),
    ('Educación', 'BookOpen', 'from-cyan-500 to-cyan-600', 200::numeric),
    ('Compras', 'ShoppingBag', 'from-amber-500 to-amber-600', 400::numeric),
    ('Otros', 'MoreHorizontal', 'from-gray-500 to-gray-600', 200::numeric)
  ) AS v(name, icon, color, budget_monthly)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.categories c
    WHERE c.user_id = NEW.id
      AND c.name = v.name
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) RLS policy for trigger path
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;

CREATE POLICY "Service role can insert users"
  ON public.users FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Ensure SELECT/UPDATE policies exist exactly once
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid()::uuid = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid()::uuid = id);

-- 5) Recreate triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_categories_for_user();

-- 6) Backfill existing users missing in public.users
INSERT INTO public.users (id, email, name, password_hash)
SELECT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ),
  ''
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
);

-- 7) Backfill default categories for users that may not have them
INSERT INTO public.categories (user_id, name, icon, color, budget_monthly)
SELECT
  u.id,
  v.name,
  v.icon,
  v.color,
  v.budget_monthly
FROM public.users u
CROSS JOIN (VALUES
  ('Alimentación', 'Utensils', 'from-blue-500 to-blue-600', 500::numeric),
  ('Transporte', 'Car', 'from-purple-500 to-purple-600', 300::numeric),
  ('Vivienda', 'Home', 'from-pink-500 to-pink-600', 1000::numeric),
  ('Entretenimiento', 'Film', 'from-orange-500 to-orange-600', 200::numeric),
  ('Salud', 'Heart', 'from-red-500 to-red-600', 300::numeric),
  ('Educación', 'BookOpen', 'from-cyan-500 to-cyan-600', 200::numeric),
  ('Compras', 'ShoppingBag', 'from-amber-500 to-amber-600', 400::numeric),
  ('Otros', 'MoreHorizontal', 'from-gray-500 to-gray-600', 200::numeric)
) AS v(name, icon, color, budget_monthly)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories c
  WHERE c.user_id = u.id
    AND c.name = v.name
);

COMMIT;

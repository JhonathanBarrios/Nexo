-- Sincronizar usuarios existentes de auth.users con tabla users
INSERT INTO public.users (id, email, name, password_hash)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', 'Usuario'),
  ''
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE id = au.id
);

-- Crear categorías por defecto para usuarios que no tienen categorías
INSERT INTO public.categories (user_id, name, icon, color, budget_monthly)
SELECT DISTINCT
  u.id,
  c.name,
  c.icon,
  c.color,
  c.budget_monthly
FROM public.users u
CROSS JOIN (VALUES
  ('Alimentación', 'Utensils', 'from-blue-500 to-blue-600', 500),
  ('Transporte', 'Car', 'from-purple-500 to-purple-600', 300),
  ('Vivienda', 'Home', 'from-pink-500 to-pink-600', 1000),
  ('Entretenimiento', 'Film', 'from-orange-500 to-orange-600', 200),
  ('Salud', 'Heart', 'from-red-500 to-red-600', 300),
  ('Educación', 'BookOpen', 'from-cyan-500 to-cyan-600', 200),
  ('Compras', 'ShoppingBag', 'from-amber-500 to-amber-600', 400),
  ('Otros', 'MoreHorizontal', 'from-gray-500 to-gray-600', 200)
) c(name, icon, color, budget_monthly)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE user_id = u.id AND name = c.name
);
-- Function to sync auth.users with custom users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, password_hash)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuario'),
    ''
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION public.create_default_categories_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, icon, color, budget_monthly)
  VALUES
    (NEW.id, 'Alimentación', 'Utensils', 'from-blue-500 to-blue-600', 500),
    (NEW.id, 'Transporte', 'Car', 'from-purple-500 to-purple-600', 300),
    (NEW.id, 'Vivienda', 'Home', 'from-pink-500 to-pink-600', 1000),
    (NEW.id, 'Entretenimiento', 'Film', 'from-orange-500 to-orange-600', 200),
    (NEW.id, 'Salud', 'Heart', 'from-red-500 to-red-600', 300),
    (NEW.id, 'Educación', 'BookOpen', 'from-cyan-500 to-cyan-600', 200),
    (NEW.id, 'Compras', 'ShoppingBag', 'from-amber-500 to-amber-600', 400),
    (NEW.id, 'Otros', 'MoreHorizontal', 'from-gray-500 to-gray-600', 200);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after users insert
DROP TRIGGER IF EXISTS on_user_created ON public.users;

CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_categories_for_user();
-- Temporarily disable the trigger to test if signup works without it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Also disable the categories trigger to avoid cascading errors
DROP TRIGGER IF EXISTS on_user_created ON public.users;


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, metodologia)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Socia'), NULL)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS msg_cobranza TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS msg_venta TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS msg_saludo TEXT;
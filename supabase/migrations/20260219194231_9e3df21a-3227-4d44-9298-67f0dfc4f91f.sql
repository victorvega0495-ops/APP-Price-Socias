
-- Create reto_solicitudes table for acquisition funnel
CREATE TABLE public.reto_solicitudes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  telefono TEXT,
  fecha_solicitud TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  estatus TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reto_solicitudes ENABLE ROW LEVEL SECURITY;

-- Users can view their own solicitud
CREATE POLICY "Users can view own reto solicitud"
ON public.reto_solicitudes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own solicitud
CREATE POLICY "Users can insert own reto solicitud"
ON public.reto_solicitudes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add unique constraint so user can only apply once
ALTER TABLE public.reto_solicitudes ADD CONSTRAINT reto_solicitudes_user_id_key UNIQUE (user_id);

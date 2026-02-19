
-- Add checklist tracking columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS visited_finanzas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visited_reto boolean NOT NULL DEFAULT false;

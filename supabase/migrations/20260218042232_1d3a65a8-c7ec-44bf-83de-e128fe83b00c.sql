
ALTER TABLE public.challenge_goals
ADD COLUMN IF NOT EXISTS pct_reposicion NUMERIC DEFAULT 65;

ALTER TABLE public.challenge_goals
ADD COLUMN IF NOT EXISTS pct_ganancia NUMERIC DEFAULT 30;

ALTER TABLE public.challenge_goals
ADD COLUMN IF NOT EXISTS pct_ahorro NUMERIC DEFAULT 20;

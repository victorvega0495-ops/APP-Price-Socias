
ALTER TABLE public.challenge_goals 
ADD COLUMN IF NOT EXISTS target_name TEXT DEFAULT 'Mi Meta';

ALTER TABLE public.challenge_goals 
ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'personalizada';

ALTER TABLE public.challenge_goals 
ADD COLUMN IF NOT EXISTS monthly_sales_needed NUMERIC DEFAULT 0;

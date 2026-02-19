
CREATE TABLE IF NOT EXISTS public.reto_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week INTEGER NOT NULL,
  day INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, week, day)
);

ALTER TABLE public.reto_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own reto progress"
ON public.reto_progress
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

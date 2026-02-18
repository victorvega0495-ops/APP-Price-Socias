
-- Create sale_items table
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own sale items"
ON public.sale_items
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.purchases WHERE purchases.id = sale_items.purchase_id AND purchases.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.purchases WHERE purchases.id = sale_items.purchase_id AND purchases.user_id = auth.uid())
);

-- Create credit_payments table
CREATE TABLE public.credit_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own credit payments"
ON public.credit_payments
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.purchases WHERE purchases.id = credit_payments.purchase_id AND purchases.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.purchases WHERE purchases.id = credit_payments.purchase_id AND purchases.user_id = auth.uid())
);

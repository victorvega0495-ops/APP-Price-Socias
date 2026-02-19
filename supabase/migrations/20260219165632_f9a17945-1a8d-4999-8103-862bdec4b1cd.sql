
CREATE OR REPLACE FUNCTION public.reset_tester_account()
RETURNS void AS $$
DECLARE
  tester_id UUID;
BEGIN
  SELECT id INTO tester_id 
  FROM auth.users 
  WHERE email = 'tester@demo.com';
  
  IF tester_id IS NOT NULL THEN
    DELETE FROM sale_items WHERE purchase_id IN (
      SELECT id FROM purchases WHERE user_id = tester_id);
    DELETE FROM credit_payments WHERE purchase_id IN (
      SELECT id FROM purchases WHERE user_id = tester_id);
    DELETE FROM purchases WHERE user_id = tester_id;
    DELETE FROM clients WHERE user_id = tester_id;
    DELETE FROM challenge_goals WHERE user_id = tester_id;
    DELETE FROM monthly_goals WHERE user_id = tester_id;
    DELETE FROM weekly_finances WHERE user_id = tester_id;
    DELETE FROM reto_progress WHERE user_id = tester_id;
    UPDATE profiles SET 
      metodologia = NULL,
      name = '',
      phone = '',
      partner_number = ''
    WHERE user_id = tester_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

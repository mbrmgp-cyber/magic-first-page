ALTER TABLE public.disciplinary_suspensions DROP CONSTRAINT IF EXISTS disciplinary_suspensions_category_check;
ALTER TABLE public.disciplinary_suspensions ADD CONSTRAINT disciplinary_suspensions_category_check
  CHECK (category IN ('rule_violation','misuse','reputation_damage','financial_loss','other','minor','warning','major','severe','expulsion'));
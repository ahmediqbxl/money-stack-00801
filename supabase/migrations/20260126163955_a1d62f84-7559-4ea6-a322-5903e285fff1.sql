-- Fix function search path for get_auto_classification
CREATE OR REPLACE FUNCTION public.get_auto_classification(account_type text)
RETURNS account_classification
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Assets: depository (checking, savings), investment, brokerage
  IF account_type ILIKE '%checking%' OR account_type ILIKE '%chequing%' OR 
     account_type ILIKE '%savings%' OR account_type ILIKE '%saving%' OR
     account_type ILIKE '%investment%' OR account_type ILIKE '%brokerage%' OR
     account_type ILIKE '%401k%' OR account_type ILIKE '%ira%' OR
     account_type ILIKE '%money market%' OR account_type ILIKE '%cd%' OR
     account_type ILIKE '%prepaid%' OR account_type ILIKE '%hsa%' OR
     account_type ILIKE '%paypal%' OR account_type ILIKE '%venmo%' THEN
    RETURN 'asset';
  -- Liabilities: credit, loan, mortgage
  ELSIF account_type ILIKE '%credit%' OR account_type ILIKE '%loan%' OR 
        account_type ILIKE '%mortgage%' OR account_type ILIKE '%line of credit%' OR
        account_type ILIKE '%overdraft%' THEN
    RETURN 'liability';
  ELSE
    -- Default to asset for unknown types
    RETURN 'asset';
  END IF;
END;
$$;
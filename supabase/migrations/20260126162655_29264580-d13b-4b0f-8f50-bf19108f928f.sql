-- Create enum for account classification
CREATE TYPE public.account_classification AS ENUM ('asset', 'liability');

-- Add classification column to accounts table
-- auto_classification will be set based on Plaid account type, user_classification is user override
ALTER TABLE public.accounts 
ADD COLUMN auto_classification account_classification,
ADD COLUMN user_classification account_classification;

-- Create function to auto-classify based on Plaid account type
CREATE OR REPLACE FUNCTION public.get_auto_classification(account_type text)
RETURNS account_classification
LANGUAGE plpgsql
IMMUTABLE
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

-- Create net worth snapshots table for historical tracking
CREATE TABLE public.net_worth_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_assets NUMERIC NOT NULL DEFAULT 0,
  total_liabilities NUMERIC NOT NULL DEFAULT 0,
  net_worth NUMERIC NOT NULL DEFAULT 0,
  account_breakdown JSONB, -- Stores encrypted breakdown by account
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

-- Enable RLS on net_worth_snapshots
ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for net_worth_snapshots
CREATE POLICY "Users can view their own snapshots" 
ON public.net_worth_snapshots 
FOR SELECT 
USING (auth.uid() = user_id AND is_user_approved(auth.uid()));

CREATE POLICY "Users can insert their own snapshots" 
ON public.net_worth_snapshots 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND is_user_approved(auth.uid()));

CREATE POLICY "Users can update their own snapshots" 
ON public.net_worth_snapshots 
FOR UPDATE 
USING (auth.uid() = user_id AND is_user_approved(auth.uid()));

CREATE POLICY "Users can delete their own snapshots" 
ON public.net_worth_snapshots 
FOR DELETE 
USING (auth.uid() = user_id AND is_user_approved(auth.uid()));

-- Create net worth goals table
CREATE TABLE public.net_worth_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_amount NUMERIC NOT NULL,
  target_date DATE,
  goal_name TEXT NOT NULL,
  description TEXT,
  is_achieved BOOLEAN NOT NULL DEFAULT false,
  achieved_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on net_worth_goals
ALTER TABLE public.net_worth_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for net_worth_goals
CREATE POLICY "Users can view their own goals" 
ON public.net_worth_goals 
FOR SELECT 
USING (auth.uid() = user_id AND is_user_approved(auth.uid()));

CREATE POLICY "Users can insert their own goals" 
ON public.net_worth_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND is_user_approved(auth.uid()));

CREATE POLICY "Users can update their own goals" 
ON public.net_worth_goals 
FOR UPDATE 
USING (auth.uid() = user_id AND is_user_approved(auth.uid()));

CREATE POLICY "Users can delete their own goals" 
ON public.net_worth_goals 
FOR DELETE 
USING (auth.uid() = user_id AND is_user_approved(auth.uid()));

-- Create trigger for goals updated_at
CREATE TRIGGER update_net_worth_goals_updated_at
BEFORE UPDATE ON public.net_worth_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create manual accounts table (for accounts not connected via Plaid)
CREATE TABLE public.manual_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- encrypted
  account_type TEXT NOT NULL, -- e.g., 'Real Estate', 'Vehicle', 'Other Asset', 'Personal Loan'
  classification account_classification NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0, -- encrypted in practice (stored as 0, real value in name field as JSON)
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT, -- encrypted
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on manual_accounts
ALTER TABLE public.manual_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for manual_accounts
CREATE POLICY "Users can view their own manual accounts" 
ON public.manual_accounts 
FOR SELECT 
USING (auth.uid() = user_id AND is_user_approved(auth.uid()));

CREATE POLICY "Users can insert their own manual accounts" 
ON public.manual_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND is_user_approved(auth.uid()));

CREATE POLICY "Users can update their own manual accounts" 
ON public.manual_accounts 
FOR UPDATE 
USING (auth.uid() = user_id AND is_user_approved(auth.uid()));

CREATE POLICY "Users can delete their own manual accounts" 
ON public.manual_accounts 
FOR DELETE 
USING (auth.uid() = user_id AND is_user_approved(auth.uid()));

-- Create trigger for manual_accounts updated_at
CREATE TRIGGER update_manual_accounts_updated_at
BEFORE UPDATE ON public.manual_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
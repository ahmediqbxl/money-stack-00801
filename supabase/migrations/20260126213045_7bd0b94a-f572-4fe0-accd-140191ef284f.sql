-- Update all existing profiles to approved status
UPDATE public.profiles 
SET approval_status = 'approved' 
WHERE approval_status != 'approved';

-- Drop existing RLS policies that check for approval on manual_accounts
DROP POLICY IF EXISTS "Users can view their own manual accounts" ON public.manual_accounts;
DROP POLICY IF EXISTS "Users can insert their own manual accounts" ON public.manual_accounts;
DROP POLICY IF EXISTS "Users can update their own manual accounts" ON public.manual_accounts;
DROP POLICY IF EXISTS "Users can delete their own manual accounts" ON public.manual_accounts;

-- Create new RLS policies without approval check for manual_accounts
CREATE POLICY "Users can view their own manual accounts" 
ON public.manual_accounts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own manual accounts" 
ON public.manual_accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manual accounts" 
ON public.manual_accounts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manual accounts" 
ON public.manual_accounts FOR DELETE 
USING (auth.uid() = user_id);

-- Drop existing RLS policies on net_worth_goals
DROP POLICY IF EXISTS "Users can view their own goals" ON public.net_worth_goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.net_worth_goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.net_worth_goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.net_worth_goals;

-- Create new RLS policies without approval check for net_worth_goals
CREATE POLICY "Users can view their own goals" 
ON public.net_worth_goals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" 
ON public.net_worth_goals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
ON public.net_worth_goals FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" 
ON public.net_worth_goals FOR DELETE 
USING (auth.uid() = user_id);

-- Drop existing RLS policies on net_worth_snapshots
DROP POLICY IF EXISTS "Users can view their own snapshots" ON public.net_worth_snapshots;
DROP POLICY IF EXISTS "Users can insert their own snapshots" ON public.net_worth_snapshots;
DROP POLICY IF EXISTS "Users can update their own snapshots" ON public.net_worth_snapshots;
DROP POLICY IF EXISTS "Users can delete their own snapshots" ON public.net_worth_snapshots;

-- Create new RLS policies without approval check for net_worth_snapshots
CREATE POLICY "Users can view their own snapshots" 
ON public.net_worth_snapshots FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots" 
ON public.net_worth_snapshots FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots" 
ON public.net_worth_snapshots FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots" 
ON public.net_worth_snapshots FOR DELETE 
USING (auth.uid() = user_id);

-- Drop existing RLS policies on accounts
DROP POLICY IF EXISTS "Approved users can view their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Approved users can insert their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Approved users can update their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Approved users can delete their own accounts" ON public.accounts;

-- Create new RLS policies without approval check for accounts
CREATE POLICY "Users can view their own accounts" 
ON public.accounts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts" 
ON public.accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" 
ON public.accounts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts" 
ON public.accounts FOR DELETE 
USING (auth.uid() = user_id);

-- Drop existing RLS policies on transactions
DROP POLICY IF EXISTS "Approved users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Approved users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Approved users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Approved users can delete their own transactions" ON public.transactions;

-- Create new RLS policies without approval check for transactions
CREATE POLICY "Users can view their own transactions" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" 
ON public.transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
ON public.transactions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
ON public.transactions FOR DELETE 
USING (auth.uid() = user_id);

-- Drop existing RLS policies on budgets
DROP POLICY IF EXISTS "Approved users can view their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Approved users can insert their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Approved users can update their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Approved users can delete their own budgets" ON public.budgets;

-- Create new RLS policies without approval check for budgets
CREATE POLICY "Users can view their own budgets" 
ON public.budgets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets" 
ON public.budgets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" 
ON public.budgets FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" 
ON public.budgets FOR DELETE 
USING (auth.uid() = user_id);

-- Drop existing RLS policies on user_preferences
DROP POLICY IF EXISTS "Approved users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Approved users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Approved users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Approved users can delete their own preferences" ON public.user_preferences;

-- Create new RLS policies without approval check for user_preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
ON public.user_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" 
ON public.user_preferences FOR DELETE 
USING (auth.uid() = user_id);
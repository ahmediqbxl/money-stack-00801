-- Add approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Add approval_status column to profiles table
ALTER TABLE public.profiles
ADD COLUMN approval_status approval_status NOT NULL DEFAULT 'pending';

-- Update existing users to be approved
UPDATE public.profiles SET approval_status = 'approved';

-- Function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND approval_status = 'approved'
  )
$$;

-- Update existing RLS policies on tables to check approval status
-- Accounts table
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.accounts;
CREATE POLICY "Approved users can view their own accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own accounts" ON public.accounts;
CREATE POLICY "Approved users can insert their own accounts"
ON public.accounts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
CREATE POLICY "Approved users can update their own accounts"
ON public.accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;
CREATE POLICY "Approved users can delete their own accounts"
ON public.accounts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

-- Transactions table
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Approved users can view their own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Approved users can insert their own transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Approved users can update their own transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
CREATE POLICY "Approved users can delete their own transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

-- Budgets table
DROP POLICY IF EXISTS "Users can view their own budgets" ON public.budgets;
CREATE POLICY "Approved users can view their own budgets"
ON public.budgets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own budgets" ON public.budgets;
CREATE POLICY "Approved users can insert their own budgets"
ON public.budgets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own budgets" ON public.budgets;
CREATE POLICY "Approved users can update their own budgets"
ON public.budgets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own budgets" ON public.budgets;
CREATE POLICY "Approved users can delete their own budgets"
ON public.budgets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

-- User preferences table
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Approved users can view their own preferences"
ON public.user_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
CREATE POLICY "Approved users can insert their own preferences"
ON public.user_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Approved users can update their own preferences"
ON public.user_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;
CREATE POLICY "Approved users can delete their own preferences"
ON public.user_preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND public.is_user_approved(auth.uid()));

-- Allow admins to view and update all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
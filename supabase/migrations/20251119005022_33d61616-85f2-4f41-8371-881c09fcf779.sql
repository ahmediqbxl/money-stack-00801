-- Add is_test_user column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_test_user boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_test_user IS 'Indicates if user should use Plaid Sandbox (test) environment instead of production';
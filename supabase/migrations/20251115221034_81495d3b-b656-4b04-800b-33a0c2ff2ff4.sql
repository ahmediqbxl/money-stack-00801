-- Add INSERT policy on profiles table as a safety fallback
-- This allows users to create their own profile if the trigger fails
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
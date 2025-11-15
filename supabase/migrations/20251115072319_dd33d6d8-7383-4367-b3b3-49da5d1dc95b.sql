-- Add notes column to transactions table for user comments
ALTER TABLE public.transactions
ADD COLUMN notes text;
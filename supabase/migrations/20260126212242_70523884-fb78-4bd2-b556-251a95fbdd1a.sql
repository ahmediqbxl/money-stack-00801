-- Change the default approval_status to 'approved' so new users are automatically approved
ALTER TABLE public.profiles 
ALTER COLUMN approval_status SET DEFAULT 'approved'::approval_status;

-- Approve all existing pending users
UPDATE public.profiles 
SET approval_status = 'approved' 
WHERE approval_status = 'pending';
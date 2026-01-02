-- Add admin privileges for info@foundationsautism.com
-- This sets is_admin = true for the user with this email

UPDATE public.profiles
SET is_admin = true
WHERE contact_email = 'info@foundationsautism.com';

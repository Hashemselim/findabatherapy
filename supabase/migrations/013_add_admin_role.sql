-- Migration: 013_add_admin_role.sql
-- Adds admin role flag to profiles for admin dashboard access

-- Add is_admin column to profiles
ALTER TABLE public.profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Create index for admin queries
CREATE INDEX profiles_is_admin_idx ON public.profiles(is_admin) WHERE is_admin = true;

-- Comment
COMMENT ON COLUMN public.profiles.is_admin IS 'Flag indicating if this user has admin privileges for managing removal requests and viewing analytics.';

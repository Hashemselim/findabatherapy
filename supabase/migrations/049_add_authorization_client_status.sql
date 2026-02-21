-- Migration: Add 'authorization' to client_status enum
-- This status sits between 'assessment' and 'active' in the client workflow

ALTER TYPE public.client_status ADD VALUE IF NOT EXISTS 'authorization' AFTER 'assessment';

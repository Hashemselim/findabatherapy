-- Migration: Add 'in_progress' status to client_task_status enum
-- This adds a middle status between 'pending' and 'completed'

-- Add the new enum value
ALTER TYPE public.client_task_status ADD VALUE 'in_progress' AFTER 'pending';

-- Update the index for pending tasks to also include in_progress tasks
DROP INDEX IF EXISTS idx_client_tasks_due_date;
CREATE INDEX idx_client_tasks_due_date ON public.client_tasks(due_date)
  WHERE status IN ('pending', 'in_progress');

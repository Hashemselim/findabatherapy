-- Add intent/workspace metadata for unified dashboard cutover
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_intent text DEFAULT 'both' CHECK (primary_intent IN ('therapy', 'jobs', 'both')),
  ADD COLUMN IF NOT EXISTS last_selected_workspace text DEFAULT 'client_growth' CHECK (last_selected_workspace IN ('client_growth', 'hiring', 'operations')),
  ADD COLUMN IF NOT EXISTS activation_completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_primary_intent ON public.profiles(primary_intent);
CREATE INDEX IF NOT EXISTS idx_profiles_last_selected_workspace ON public.profiles(last_selected_workspace);

ALTER TABLE public.communication_templates
  ADD COLUMN IF NOT EXISTS cc text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS base_template_id uuid REFERENCES public.communication_templates(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE public.communication_templates
SET cc = '{}'
WHERE cc IS NULL;

ALTER TABLE public.communication_templates
  ALTER COLUMN cc SET DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_comm_templates_base_template_id
  ON public.communication_templates(base_template_id)
  WHERE base_template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comm_templates_archived_at
  ON public.communication_templates(profile_id, archived_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_comm_templates_profile_base_template
  ON public.communication_templates(profile_id, base_template_id)
  WHERE base_template_id IS NOT NULL;

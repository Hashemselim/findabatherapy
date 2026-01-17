-- Migration: Restructure authorizations to support multiple services per authorization
-- This replaces the single service_type/billing_code pattern with a services child table

-- 1. Update auth_status enum to add 'draft' (rename pending to draft for clarity)
ALTER TYPE public.auth_status ADD VALUE IF NOT EXISTS 'draft';

-- 2. Create the authorization services table
CREATE TABLE public.client_authorization_services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  authorization_id uuid NOT NULL REFERENCES public.client_authorizations(id) ON DELETE CASCADE,

  -- Service identification
  service_type text NOT NULL,                    -- Full label e.g., "Adaptive Behavior Treatment (97153)"
  billing_code text NOT NULL,                    -- Code e.g., "97153" or custom code for "other"
  custom_billing_code text,                      -- For "other" type, the custom code entered

  -- Date configuration
  use_auth_dates boolean NOT NULL DEFAULT true,  -- If true, inherit dates from parent authorization
  start_date date,                               -- Custom start date if use_auth_dates is false
  end_date date,                                 -- Custom end date if use_auth_dates is false

  -- Hours and units
  hours_per_week decimal(10, 2),                 -- User enters this
  hours_per_auth decimal(10, 2),                 -- Calculated or manual: hours_per_week * total_weeks
  units_per_week integer,                        -- Calculated or manual: hours_per_week * 4
  units_per_auth integer,                        -- Calculated or manual: hours_per_week * 4 * total_weeks
  units_used integer NOT NULL DEFAULT 0,         -- Tracked usage
  use_calculated_values boolean NOT NULL DEFAULT true,  -- If true, auto-calculate units fields

  -- Notes
  notes text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 3. Create indexes for authorization services
CREATE INDEX idx_auth_services_authorization_id ON public.client_authorization_services(authorization_id);
CREATE INDEX idx_auth_services_billing_code ON public.client_authorization_services(billing_code);
CREATE INDEX idx_auth_services_deleted_at ON public.client_authorization_services(deleted_at) WHERE deleted_at IS NULL;

-- 4. Enable RLS on authorization services
ALTER TABLE public.client_authorization_services ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for authorization services (through authorization -> client ownership)
CREATE POLICY "Users can manage authorization services through client ownership"
  ON public.client_authorization_services
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.client_authorizations ca
      JOIN public.clients c ON ca.client_id = c.id
      WHERE ca.id = client_authorization_services.authorization_id
      AND c.profile_id = auth.uid()
      AND c.deleted_at IS NULL
      AND ca.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_authorizations ca
      JOIN public.clients c ON ca.client_id = c.id
      WHERE ca.id = client_authorization_services.authorization_id
      AND c.profile_id = auth.uid()
      AND c.deleted_at IS NULL
      AND ca.deleted_at IS NULL
    )
  );

-- 6. Create updated_at trigger for authorization services
CREATE TRIGGER update_client_authorization_services_updated_at
  BEFORE UPDATE ON public.client_authorization_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Drop columns from client_authorizations that are moving to services
-- (keeping the columns for now in case we need rollback, just making them nullable)
ALTER TABLE public.client_authorizations
  ALTER COLUMN service_type DROP NOT NULL,
  ALTER COLUMN billing_code DROP NOT NULL;

-- Note: We're keeping these columns temporarily:
-- service_type, billing_code, units_requested, units_per_week_authorized, rate_per_unit
-- They can be dropped in a future migration once we confirm the new structure is stable

-- 8. Add comment explaining the new structure
COMMENT ON TABLE public.client_authorization_services IS
  'Services within an authorization. Each authorization can have multiple services, each with its own billing code, dates, and units.';

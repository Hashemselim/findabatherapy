-- Add services_offered attribute definition
-- This is required because listing_attribute_values.attribute_key has a foreign key
-- constraint to listing_attribute_definitions.attribute_key

INSERT INTO public.listing_attribute_definitions (attribute_key, label, variant, description, is_filterable)
VALUES (
  'services_offered',
  'Services Offered',
  'multi_select',
  'Types of therapy services offered: ABA, OT, Speech, PT, Feeding, Social Skills.',
  true
)
ON CONFLICT (attribute_key) DO NOTHING;

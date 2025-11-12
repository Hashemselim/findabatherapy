insert into public.listing_attribute_definitions (attribute_key, label, variant, description, options, is_filterable)
values
  ('services', 'Service Type', 'multi_select', 'In-home, in-center, telehealth, and hybrid options.', jsonb_build_object('options', array['in_home','in_center','telehealth','hybrid']), true)
  on conflict (attribute_key) do update set label = excluded.label,
    variant = excluded.variant,
    description = excluded.description,
    options = excluded.options,
    is_filterable = excluded.is_filterable;

insert into public.listing_attribute_definitions (attribute_key, label, variant, description, is_filterable)
values
  ('insurances', 'Insurances Accepted', 'multi_select', 'Commercial, Medicaid, TRICARE, self-pay, and more.', true),
  ('ages_served', 'Ages Served', 'range', 'Filter by early intervention, school-age, or adult services.', true),
  ('languages', 'Languages', 'multi_select', 'Identify multilingual teams and culturally aligned care.', true),
  ('diagnoses', 'Diagnoses Supported', 'multi_select', 'Autism, ADHD, anxiety, and other behavioral needs.', true),
  ('clinical_specialties', 'Clinical Specialties', 'multi_select', 'School consultation, parent training, feeding clinics, occupational therapy, and more.', true),
  ('availability', 'Availability', 'boolean', 'Show agencies accepting new clients now.', true),
  ('telehealth', 'Telehealth', 'boolean', 'Indicates if the agency offers virtual services.', true),
  ('age_min', 'Minimum Age', 'number', 'Lowest age served (in years).', true),
  ('age_max', 'Maximum Age', 'number', 'Highest age served (in years).', true)
  on conflict (attribute_key) do update set label = excluded.label,
    variant = excluded.variant,
    description = excluded.description,
    is_filterable = excluded.is_filterable;

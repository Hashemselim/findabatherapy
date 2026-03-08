-- =============================================================================
-- Workspace memberships and invitations
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'profile_membership_role'
  ) THEN
    CREATE TYPE public.profile_membership_role AS ENUM ('owner', 'admin', 'member');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'profile_membership_status'
  ) THEN
    CREATE TYPE public.profile_membership_status AS ENUM ('active', 'revoked');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'profile_invitation_status'
  ) THEN
    CREATE TYPE public.profile_invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profile_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.profile_membership_role NOT NULL,
  status public.profile_membership_status NOT NULL DEFAULT 'active',
  invited_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_memberships_profile_user
  ON public.profile_memberships(profile_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_memberships_user_active
  ON public.profile_memberships(user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_profile_memberships_profile
  ON public.profile_memberships(profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_memberships_email
  ON public.profile_memberships(lower(email));

CREATE TABLE IF NOT EXISTS public.profile_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.profile_membership_role NOT NULL,
  status public.profile_invitation_status NOT NULL DEFAULT 'pending',
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  invited_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_invitations_token_hash
  ON public.profile_invitations(token_hash);

CREATE INDEX IF NOT EXISTS idx_profile_invitations_profile
  ON public.profile_invitations(profile_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_invitations_pending_email
  ON public.profile_invitations(profile_id, lower(email))
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS set_profile_memberships_updated_at ON public.profile_memberships;
CREATE TRIGGER set_profile_memberships_updated_at
  BEFORE UPDATE ON public.profile_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_profile_invitations_updated_at ON public.profile_invitations;
CREATE TRIGGER set_profile_invitations_updated_at
  BEFORE UPDATE ON public.profile_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.profile_memberships (profile_id, user_id, email, role, status, joined_at)
SELECT
  p.id,
  p.id,
  lower(p.contact_email),
  'owner',
  'active',
  COALESCE(p.created_at, now())
FROM public.profiles p
LEFT JOIN public.profile_memberships m
  ON m.profile_id = p.id
 AND m.user_id = p.id
WHERE m.id IS NULL
ON CONFLICT (profile_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_profile_member(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profile_memberships membership
    WHERE membership.profile_id = target_profile_id
      AND membership.user_id = auth.uid()
      AND membership.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_profile_admin(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profile_memberships membership
    WHERE membership.profile_id = target_profile_id
      AND membership.user_id = auth.uid()
      AND membership.status = 'active'
      AND membership.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_profile_owner(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profile_memberships membership
    WHERE membership.profile_id = target_profile_id
      AND membership.user_id = auth.uid()
      AND membership.status = 'active'
      AND membership.role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_listing_member(target_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings listing
    WHERE listing.id = target_listing_id
      AND public.is_profile_member(listing.profile_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_listing_admin(target_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings listing
    WHERE listing.id = target_listing_id
      AND public.is_profile_admin(listing.profile_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_profile_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_profile_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_profile_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_listing_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_listing_admin(uuid) TO authenticated;

ALTER TABLE public.profile_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view workspace memberships" ON public.profile_memberships;
CREATE POLICY "Members can view workspace memberships"
  ON public.profile_memberships FOR SELECT TO authenticated
  USING (public.is_profile_member(profile_id));

DROP POLICY IF EXISTS "Owners manage workspace memberships" ON public.profile_memberships;
CREATE POLICY "Owners manage workspace memberships"
  ON public.profile_memberships FOR ALL TO authenticated
  USING (public.is_profile_owner(profile_id))
  WITH CHECK (public.is_profile_owner(profile_id));

DROP POLICY IF EXISTS "Admins view invitations" ON public.profile_invitations;
CREATE POLICY "Admins view invitations"
  ON public.profile_invitations FOR SELECT TO authenticated
  USING (public.is_profile_admin(profile_id));

DROP POLICY IF EXISTS "Admins manage invitations" ON public.profile_invitations;
CREATE POLICY "Admins manage invitations"
  ON public.profile_invitations FOR ALL TO authenticated
  USING (public.is_profile_admin(profile_id))
  WITH CHECK (public.is_profile_admin(profile_id));

DROP POLICY IF EXISTS "Profiles are editable by their owners" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by owner or public" ON public.profiles;
CREATE POLICY "Profiles viewable by member or public"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_profile_member(id)
    OR id IN (SELECT profile_id FROM public.listings WHERE status = 'published')
  );

CREATE POLICY "Profiles editable by workspace admins"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_profile_admin(id))
  WITH CHECK (public.is_profile_admin(id));

DROP POLICY IF EXISTS "Agencies manage own listings" ON public.listings;
DROP POLICY IF EXISTS "Listings viewable by owner or public" ON public.listings;
CREATE POLICY "Listings viewable by member or public"
  ON public.listings FOR SELECT TO authenticated
  USING (
    public.is_profile_member(profile_id)
    OR status = 'published'
  );

CREATE POLICY "Workspace members manage listings"
  ON public.listings FOR ALL TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

DROP POLICY IF EXISTS "Agencies manage their locations" ON public.locations;
DROP POLICY IF EXISTS "Locations viewable by owner or public" ON public.locations;
CREATE POLICY "Locations viewable by member or public"
  ON public.locations FOR SELECT TO authenticated
  USING (
    public.is_listing_member(listing_id)
    OR (SELECT status FROM public.listings WHERE id = listing_id) = 'published'
  );

CREATE POLICY "Workspace members manage locations"
  ON public.locations FOR ALL TO authenticated
  USING (public.is_listing_member(listing_id))
  WITH CHECK (public.is_listing_member(listing_id));

DROP POLICY IF EXISTS "Agencies manage media" ON public.media_assets;
CREATE POLICY "Workspace members manage media"
  ON public.media_assets FOR ALL TO authenticated
  USING (public.is_listing_member(listing_id))
  WITH CHECK (public.is_listing_member(listing_id));

DROP POLICY IF EXISTS "Agencies manage attributes" ON public.listing_attribute_values;
DROP POLICY IF EXISTS "Attributes viewable by owner or public" ON public.listing_attribute_values;
CREATE POLICY "Attributes viewable by member or public"
  ON public.listing_attribute_values FOR SELECT TO authenticated
  USING (
    public.is_listing_member(listing_id)
    OR (SELECT status FROM public.listings WHERE id = listing_id) = 'published'
  );

CREATE POLICY "Workspace members manage attributes"
  ON public.listing_attribute_values FOR ALL TO authenticated
  USING (public.is_listing_member(listing_id))
  WITH CHECK (public.is_listing_member(listing_id));

DROP POLICY IF EXISTS "Users can view own team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can insert own team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can update own team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can delete own team members" ON public.team_members;
CREATE POLICY "Workspace members manage team members"
  ON public.team_members FOR ALL TO authenticated
  USING (public.is_profile_member(profile_id))
  WITH CHECK (public.is_profile_member(profile_id));

DROP POLICY IF EXISTS "Users can view own employee documents" ON public.employee_documents;
DROP POLICY IF EXISTS "Users can insert own employee documents" ON public.employee_documents;
DROP POLICY IF EXISTS "Users can update own employee documents" ON public.employee_documents;
DROP POLICY IF EXISTS "Users can delete own employee documents" ON public.employee_documents;
CREATE POLICY "Workspace members manage employee documents"
  ON public.employee_documents FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_members.id = employee_documents.team_member_id
      AND public.is_profile_member(team_members.profile_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_members.id = employee_documents.team_member_id
      AND public.is_profile_member(team_members.profile_id)
  ));

DROP POLICY IF EXISTS "Users can view own addons" ON public.profile_addons;
CREATE POLICY "Members can view workspace addons"
  ON public.profile_addons FOR SELECT TO authenticated
  USING (public.is_profile_member(profile_id));

DROP POLICY IF EXISTS "Service role manages addons" ON public.profile_addons;
CREATE POLICY "Owners manage workspace addons"
  ON public.profile_addons FOR ALL TO authenticated
  USING (public.is_profile_owner(profile_id))
  WITH CHECK (public.is_profile_owner(profile_id));

CREATE POLICY "Service role manages addons"
  ON public.profile_addons FOR ALL
  USING (auth.role() = 'service_role');

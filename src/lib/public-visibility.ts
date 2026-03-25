const INTERNAL_TEST_EMAIL_DOMAIN = "@test.findabatherapy.com";

export interface PublicVisibilityProfile {
  contact_email?: string | null;
  is_seeded?: boolean | null;
}

export function isInternalTestEmail(email?: string | null): boolean {
  return email?.trim().toLowerCase().endsWith(INTERNAL_TEST_EMAIL_DOMAIN) ?? false;
}

export function isPublicProfileVisible(
  profile: PublicVisibilityProfile | null | undefined
): boolean {
  if (!profile) {
    return false;
  }

  return !isInternalTestEmail(profile.contact_email);
}

export function filterPublicProfiles<T>(
  rows: T[],
  getProfile: (row: T) => PublicVisibilityProfile | null | undefined
): T[] {
  return rows.filter((row) => isPublicProfileVisible(getProfile(row)));
}

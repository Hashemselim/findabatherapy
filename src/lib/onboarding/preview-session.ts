export const ONBOARDING_PREVIEW_SESSION_KEY = "onboarding-preview-draft";
export const ONBOARDING_PREVIEW_COOKIE_KEY = "onboarding-preview-draft";

export interface OnboardingPreviewDraft {
  agencyName?: string | null;
  headline?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  slug?: string | null;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function writePreviewDraftCookie(value: OnboardingPreviewDraft | null) {
  if (!isBrowser()) return;

  if (!value) {
    window.document.cookie = `${ONBOARDING_PREVIEW_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  window.document.cookie = [
    `${ONBOARDING_PREVIEW_COOKIE_KEY}=${encodeURIComponent(JSON.stringify(value))}`,
    "Path=/",
    "SameSite=Lax",
  ].join("; ");
}

export function readOnboardingPreviewDraft(): OnboardingPreviewDraft | null {
  if (!isBrowser()) return null;

  try {
    const value = window.sessionStorage.getItem(ONBOARDING_PREVIEW_SESSION_KEY);
    if (!value) return null;
    return JSON.parse(value) as OnboardingPreviewDraft;
  } catch {
    return null;
  }
}

export function mergeOnboardingPreviewDraft(update: OnboardingPreviewDraft) {
  if (!isBrowser()) return;

  const current = readOnboardingPreviewDraft() ?? {};
  const nextValue = {
    ...current,
    ...update,
  };
  window.sessionStorage.setItem(ONBOARDING_PREVIEW_SESSION_KEY, JSON.stringify(nextValue));
  writePreviewDraftCookie(nextValue);
}

export function clearOnboardingPreviewDraft() {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(ONBOARDING_PREVIEW_SESSION_KEY);
  writePreviewDraftCookie(null);
}

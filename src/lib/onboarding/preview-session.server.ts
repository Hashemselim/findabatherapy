import "server-only";

import { cookies } from "next/headers";

import {
  ONBOARDING_PREVIEW_COOKIE_KEY,
  type OnboardingPreviewDraft,
} from "@/lib/onboarding/preview-session";

export async function readOnboardingPreviewDraftFromCookie(): Promise<OnboardingPreviewDraft | null> {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(ONBOARDING_PREVIEW_COOKIE_KEY)?.value;
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(rawValue)) as OnboardingPreviewDraft;
  } catch {
    return null;
  }
}

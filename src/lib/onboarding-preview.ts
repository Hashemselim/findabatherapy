export function isDevOnboardingPreviewEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_ONBOARDING_PREVIEW === "true"
  );
}


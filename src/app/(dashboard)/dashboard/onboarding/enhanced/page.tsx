import { redirect } from "next/navigation";

export default function LegacyOnboardingEnhancedRedirect() {
  redirect("/dashboard/onboarding/services");
}

import { redirect } from "next/navigation";

export default function LegacyOnboardingReviewRedirect() {
  redirect("/dashboard/onboarding/plan");
}

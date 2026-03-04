import { redirect } from "next/navigation";

export default function LegacyOnboardingBasicsRedirect() {
  redirect("/dashboard/onboarding/details");
}

import { redirect } from "next/navigation";

// PRD 3.2: Onboarding starts at practice details (Step 2 after account creation)
// Plan is already selected from pricing page via intended_plan
export default function OnboardingPage() {
  redirect("/dashboard/onboarding/details");
}

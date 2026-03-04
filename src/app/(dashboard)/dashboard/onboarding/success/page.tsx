import { redirect } from "next/navigation";

export default function LegacyOnboardingSuccessRedirect() {
  redirect("/dashboard?welcome=1");
}

import { redirect } from "next/navigation";

export default function LegacyOnboardingSuccessRedirect() {
  redirect("/dashboard/clients/pipeline?welcome=1");
}

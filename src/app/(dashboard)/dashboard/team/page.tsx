import { redirect } from "next/navigation";

export default function LegacyDashboardTeamPage() {
  redirect("/dashboard/settings/users");
}

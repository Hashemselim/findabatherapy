import { redirect } from "next/navigation";

export default function LegacyDashboardJobApplicationsPage() {
  redirect("/dashboard/team/applicants");
}

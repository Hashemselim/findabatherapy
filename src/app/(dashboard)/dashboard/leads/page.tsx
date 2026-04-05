import { redirect } from "next/navigation";

export default function LegacyDashboardLeadsPage() {
  redirect("/dashboard/clients/leads");
}

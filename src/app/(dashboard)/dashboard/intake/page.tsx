import { redirect } from "next/navigation";

// Redirect to inbox page with intake-form tab selected
export default function DashboardIntakePage() {
  redirect("/dashboard/inbox?tab=intake-form");
}

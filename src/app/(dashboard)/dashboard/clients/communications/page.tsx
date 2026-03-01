import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowRight,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardTracker } from "@/components/analytics/dashboard-tracker";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";
import { getUser } from "@/lib/supabase/server";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { getAllCommunications } from "@/lib/actions/communications";
import { DEMO_COMMUNICATIONS } from "@/lib/demo/data";

const STATUS_ICON = {
  sent: CheckCircle2,
  failed: XCircle,
  bounced: AlertCircle,
} as const;

const STATUS_STYLE = {
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  bounced: "bg-amber-100 text-amber-700",
} as const;

export default async function CommunicationsPage() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  // Use demo data for free users, real data for pro
  let communications = DEMO_COMMUNICATIONS;
  let total = DEMO_COMMUNICATIONS.length;

  if (!isPreview) {
    const result = await getAllCommunications(undefined, 1, 50);
    communications = result.success && result.data ? result.data.communications : [];
    total = result.success && result.data ? result.data.total : 0;
  }

  const sentCount = communications.filter((c) => c.status === "sent").length;
  const failedCount = communications.filter((c) => c.status === "failed").length;

  return (
    <div className="space-y-3">
      <DashboardTracker section="communications" />

      {isPreview && (
        <PreviewBanner
          message="This is a preview of client communications. Go Live to send real emails and track history."
          variant="inline"
          triggerFeature="communications"
        />
      )}

      {/* Header */}
      <DashboardPageHeader
        title="Communications"
        description="View all client email communications sent from your agency."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/clients">
            View Clients
          </Link>
        </Button>
      </DashboardPageHeader>

      {/* Summary Cards */}
      <PreviewOverlay isPreview={isPreview}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sentCount}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{failedCount}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      </PreviewOverlay>

      {/* Communications Table */}
      <PreviewOverlay isPreview={isPreview} showLabel={false}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Communications</CardTitle>
          <CardDescription>
            All emails sent through the communication templates system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {communications.length === 0 ? (
            <div className="py-12 text-center">
              <Mail className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                No communications sent yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Go to a client&apos;s profile and click &quot;Send&quot; in the Communications section.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/dashboard/clients">
                  View Clients
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-3 pl-6 text-left font-medium">Status</th>
                    <th className="pb-3 text-left font-medium">Client</th>
                    <th className="pb-3 text-left font-medium">Subject</th>
                    <th className="pb-3 text-left font-medium hidden md:table-cell">Recipient</th>
                    <th className="pb-3 text-left font-medium hidden sm:table-cell">Template</th>
                    <th className="pb-3 pr-6 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {communications.map((comm) => {
                    const StatusIcon = STATUS_ICON[comm.status] || CheckCircle2;
                    const statusStyle = STATUS_STYLE[comm.status] || STATUS_STYLE.sent;

                    return (
                      <tr key={comm.id} className="hover:bg-muted/50">
                        <td className="py-3 pl-6">
                          <Badge variant="secondary" className={`text-xs ${statusStyle}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {comm.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Link
                            href={`/dashboard/clients/${comm.client_id}`}
                            className="font-medium hover:underline"
                          >
                            {comm.client_name || "Unknown"}
                          </Link>
                        </td>
                        <td className="py-3 max-w-[200px] truncate">
                          {comm.subject}
                        </td>
                        <td className="py-3 hidden md:table-cell text-muted-foreground">
                          {comm.recipient_email}
                        </td>
                        <td className="py-3 hidden sm:table-cell">
                          {comm.template_slug ? (
                            <Badge variant="outline" className="text-xs">
                              {comm.template_slug.replace(/-/g, " ")}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Custom</span>
                          )}
                        </td>
                        <td className="py-3 pr-6 text-muted-foreground whitespace-nowrap">
                          {format(new Date(comm.sent_at), "MMM d, yyyy")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </PreviewOverlay>
    </div>
  );
}

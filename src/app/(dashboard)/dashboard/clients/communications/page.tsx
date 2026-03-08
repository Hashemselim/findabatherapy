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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardTracker } from "@/components/analytics/dashboard-tracker";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import {
  DashboardEmptyState,
  DashboardStatCard,
  DashboardStatusBadge,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCard,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeader,
  DashboardTableRow,
  type DashboardTone,
} from "@/components/dashboard/ui";
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
  sent: "success",
  failed: "danger",
  bounced: "warning",
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
        <DashboardStatCard
          label="Total Sent"
          value={total}
          icon={<Mail className="h-5 w-5" />}
          tone="info"
        />
        <DashboardStatCard
          label="Delivered"
          value={sentCount}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <DashboardStatCard
          label="Failed"
          value={failedCount}
          icon={<XCircle className="h-5 w-5" />}
          tone="danger"
        />
      </div>

      </PreviewOverlay>

      {/* Communications Table */}
      <PreviewOverlay isPreview={isPreview} showLabel={false}>
      <DashboardTableCard>
        <CardHeader>
          <CardTitle className="text-lg">Recent Communications</CardTitle>
          <CardDescription>
            All emails sent through the communication templates system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {communications.length === 0 ? (
            <DashboardEmptyState
              icon={Mail}
              title="No communications sent yet"
              description="Go to a client's profile and click Send in the communications section to start tracking messages here."
              action={(
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/clients">
                    View Clients
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              className="border-0 shadow-none"
            />
          ) : (
            <DashboardTable>
              <DashboardTableHeader>
                <DashboardTableRow>
                  <DashboardTableHead className="pl-6 normal-case tracking-normal">Status</DashboardTableHead>
                  <DashboardTableHead className="normal-case tracking-normal">Client</DashboardTableHead>
                  <DashboardTableHead className="normal-case tracking-normal">Subject</DashboardTableHead>
                  <DashboardTableHead className="hidden normal-case tracking-normal md:table-cell">Recipient</DashboardTableHead>
                  <DashboardTableHead className="hidden normal-case tracking-normal sm:table-cell">Template</DashboardTableHead>
                  <DashboardTableHead className="pr-6 normal-case tracking-normal">Date</DashboardTableHead>
                </DashboardTableRow>
              </DashboardTableHeader>
              <DashboardTableBody>
                  {communications.map((comm) => {
                    const StatusIcon = STATUS_ICON[comm.status] || CheckCircle2;
                    const statusTone = STATUS_STYLE[comm.status] || STATUS_STYLE.sent;

                    return (
                      <DashboardTableRow key={comm.id}>
                        <DashboardTableCell className="py-3 pl-6">
                          <DashboardStatusBadge tone={statusTone as DashboardTone} className="text-xs">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {comm.status}
                          </DashboardStatusBadge>
                        </DashboardTableCell>
                        <DashboardTableCell className="py-3">
                          <Link
                            href={`/dashboard/clients/${comm.client_id}`}
                            className="font-medium hover:underline"
                          >
                            {comm.client_name || "Unknown"}
                          </Link>
                        </DashboardTableCell>
                        <DashboardTableCell className="max-w-[200px] py-3">
                          {comm.subject}
                        </DashboardTableCell>
                        <DashboardTableCell className="hidden py-3 text-muted-foreground md:table-cell">
                          {comm.recipient_email}
                        </DashboardTableCell>
                        <DashboardTableCell className="hidden py-3 sm:table-cell">
                          {comm.template_slug ? (
                            <DashboardStatusBadge tone="default" className="text-xs">
                              {comm.template_slug.replace(/-/g, " ")}
                            </DashboardStatusBadge>
                          ) : (
                            <span className="text-muted-foreground">Custom</span>
                          )}
                        </DashboardTableCell>
                        <DashboardTableCell className="whitespace-nowrap py-3 pr-6 text-muted-foreground">
                          {format(new Date(comm.sent_at), "MMM d, yyyy")}
                        </DashboardTableCell>
                      </DashboardTableRow>
                    );
                  })}
              </DashboardTableBody>
            </DashboardTable>
          )}
        </CardContent>
      </DashboardTableCard>
      </PreviewOverlay>
    </div>
  );
}

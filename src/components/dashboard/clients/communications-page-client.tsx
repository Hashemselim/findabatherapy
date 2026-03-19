"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Mail,
  XCircle,
} from "lucide-react";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DashboardTabsList,
  DashboardTabsTrigger,
  type DashboardTone,
} from "@/components/dashboard/ui";
import { PreviewOverlay } from "@/components/ui/preview-overlay";
import { CommunicationTemplatesManager } from "./communication-templates-manager";
import type { ClientCommunication } from "@/lib/actions/communications";

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

export function CommunicationsPageClient({
  communications,
  total,
  sentCount,
  failedCount,
  isPreview,
}: {
  communications: ClientCommunication[];
  total: number;
  sentCount: number;
  failedCount: number;
  isPreview: boolean;
}) {
  return (
    <Tabs defaultValue="history" className="space-y-4">
      <DashboardTabsList>
        <DashboardTabsTrigger value="history">History</DashboardTabsTrigger>
        <DashboardTabsTrigger value="templates">Templates</DashboardTabsTrigger>
      </DashboardTabsList>

      <div className="space-y-4">
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

        <TabsContent value="history" className="mt-0">
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
                    action={
                      <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/clients">
                          View Clients
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    }
                    className="border-0 shadow-none"
                  />
                ) : (
                  <DashboardTable className="table-fixed">
                    <DashboardTableHeader>
                      <DashboardTableRow>
                        <DashboardTableHead className="w-[120px] pl-6 normal-case tracking-normal">Status</DashboardTableHead>
                        <DashboardTableHead className="w-[160px] normal-case tracking-normal">Client</DashboardTableHead>
                        <DashboardTableHead className="w-[28%] normal-case tracking-normal">Subject</DashboardTableHead>
                        <DashboardTableHead className="hidden w-[26%] normal-case tracking-normal md:table-cell">Recipient</DashboardTableHead>
                        <DashboardTableHead className="hidden w-[200px] normal-case tracking-normal sm:table-cell">Template</DashboardTableHead>
                        <DashboardTableHead className="w-[120px] pr-6 normal-case tracking-normal">Date</DashboardTableHead>
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
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {comm.status}
                              </DashboardStatusBadge>
                            </DashboardTableCell>
                            <DashboardTableCell className="py-3">
                              <Link
                                href={`/dashboard/clients/${comm.client_id}`}
                                className="block truncate font-medium hover:underline"
                              >
                                {comm.client_name || "Unknown"}
                              </Link>
                            </DashboardTableCell>
                            <DashboardTableCell className="py-3 align-top whitespace-normal">
                              <div className="leading-5 [overflow-wrap:anywhere]">{comm.subject}</div>
                            </DashboardTableCell>
                            <DashboardTableCell className="hidden py-3 align-top whitespace-normal text-muted-foreground md:table-cell">
                              <div className="leading-5 [overflow-wrap:anywhere]">{comm.recipient_email}</div>
                            </DashboardTableCell>
                            <DashboardTableCell className="hidden py-3 sm:table-cell">
                              {comm.template_slug ? (
                                <DashboardStatusBadge tone="default" className="max-w-full text-xs">
                                  <span className="block truncate">{comm.template_slug.replace(/-/g, " ")}</span>
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
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <PreviewOverlay isPreview={isPreview} showLabel={false}>
            <CommunicationTemplatesManager />
          </PreviewOverlay>
        </TabsContent>
      </div>
    </Tabs>
  );
}

"use client";

import type { ReferralCampaign, ReferralTemplate } from "@/lib/actions/referrals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ReferralCampaignsClient({
  campaigns,
  templates,
}: {
  campaigns: ReferralCampaign[];
  templates: ReferralTemplate[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Campaign History</CardTitle>
          <CardDescription>
            Every bulk send is logged here so staff can see what went out and how it performed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns yet. Use the sources page to launch a bulk send.</p>
          ) : (
            campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">{campaign.status}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {campaign.launched_at ? new Date(campaign.launched_at).toLocaleString() : new Date(campaign.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <p className="text-muted-foreground">Recipients</p>
                    <p className="text-lg font-semibold">{campaign.total_recipients}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <p className="text-muted-foreground">Sent</p>
                    <p className="text-lg font-semibold">{campaign.sent_count}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <p className="text-muted-foreground">Failed</p>
                    <p className="text-lg font-semibold">{campaign.failed_count}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template Library</CardTitle>
          <CardDescription>Templates available for outreach.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{template.name}</p>
                <p className="text-xs text-muted-foreground">{template.template_type.replace(/_/g, " ")}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{template.subject}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

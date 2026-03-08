"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Loader2, Mail, Bell, Inbox } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DashboardCallout, DashboardFeatureCard } from "@/components/dashboard/ui";
import { updateContactFormEnabled } from "@/lib/actions/listings";

interface ContactFormCardProps {
  planTier: string;
  contactFormEnabled?: boolean;
}

export function ContactFormCard({ planTier, contactFormEnabled = true }: ContactFormCardProps) {
  const isPaidPlan = planTier !== "free";
  const [isEnabled, setIsEnabled] = useState(contactFormEnabled);
  const [isPending, startTransition] = useTransition();

  // Free plan: Show locked view
  if (!isPaidPlan) {
    return (
      <DashboardFeatureCard
        title="Contact Form & Inbox"
        description={(
          <>
            <span className="font-medium text-foreground">Stop missing leads.</span> Families can contact you directly from your listing and every inquiry lands in your dashboard inbox.
          </>
        )}
        icon={MessageSquare}
        badgeLabel="Pro"
        highlights={[
          {
            title: "Family submits form",
            description: "Name, phone, email and their needs",
            icon: Mail,
            tone: "info",
          },
          {
            title: "You get notified",
            description: "Instant email alert",
            icon: Bell,
            tone: "warning",
          },
          {
            title: "Review in dashboard",
            description: "All leads in one place",
            icon: Inbox,
            tone: "success",
          },
        ]}
        bullets={[
          "Mark inquiries as read or unread",
          "Archive completed inquiries",
          "Built-in spam protection",
          "Never miss a potential client",
        ]}
        footer={(
          <>
            <span className="font-medium text-foreground">Ready to capture more leads?</span>
          </>
        )}
        action={(
          <Button asChild size="sm" className="w-full shrink-0 sm:w-auto">
            <Link href="/dashboard/billing">
              Upgrade Now
            </Link>
          </Button>
        )}
      />
    );
  }

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
    startTransition(async () => {
      const result = await updateContactFormEnabled(checked);
      if (!result.success) {
        // Revert on error
        setIsEnabled(!checked);
      }
    });
  };

  // Paid plan: Show toggle and status
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Contact Form
        </CardTitle>
        <CardDescription>
          Allow families to contact you directly through your listing page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
          <div className="space-y-0.5">
            <Label htmlFor="contact-form-toggle" className="cursor-pointer font-medium">
              Enable Contact Form
            </Label>
            <p className="text-sm text-muted-foreground">
              Show a contact form on your listing page
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="contact-form-toggle"
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={isPending}
            />
          </div>
        </div>

        {/* Status message */}
        {isEnabled ? (
          <DashboardCallout
            tone="success"
            icon={MessageSquare}
            title="Contact form is active"
            description={(
              <>
                Families can reach you through your listing. Check your{" "}
                <Link href="/dashboard/notifications" className="underline hover:no-underline">
                  Notifications
                </Link>{" "}
                for new inquiries.
              </>
            )}
          />
        ) : (
          <DashboardCallout
            tone="default"
            icon={MessageSquare}
            title="Contact form is disabled"
            description="Families will only see your contact information (email, phone, website)."
          />
        )}
      </CardContent>
    </Card>
  );
}

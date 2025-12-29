"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Sparkles, Loader2, Mail, Bell, Inbox, Shield, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
      <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-slate-50 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.08),transparent_50%)]" />

        <div className="relative p-6">
          {/* Header with strong value prop */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">Contact Form & Inbox</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    <Sparkles className="h-3 w-3" />
                    Pro
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  <span className="font-medium text-slate-800">Stop missing leads.</span> Families can contact you directly from your listing - no phone tag, no missed calls. Every inquiry lands in your dashboard inbox.
                </p>
              </div>
            </div>
          </div>

          {/* Visual flow: How it works */}
          <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-3">
            <div className="relative flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 sm:flex-col sm:p-4 sm:text-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 sm:mx-auto sm:mb-3">
                <Mail className="h-5 w-5" />
              </div>
              <div className="sm:text-center">
                <p className="text-sm font-medium text-slate-800">Family submits form</p>
                <p className="mt-0.5 text-xs text-slate-500 sm:mt-1">Name, phone, email & their needs</p>
              </div>
              <div className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-slate-300 sm:block">→</div>
            </div>
            <div className="relative flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 sm:flex-col sm:p-4 sm:text-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 sm:mx-auto sm:mb-3">
                <Bell className="h-5 w-5" />
              </div>
              <div className="sm:text-center">
                <p className="text-sm font-medium text-slate-800">You get notified</p>
                <p className="mt-0.5 text-xs text-slate-500 sm:mt-1">Instant email alert</p>
              </div>
              <div className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-slate-300 sm:block">→</div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 sm:flex-col sm:p-4 sm:text-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 sm:mx-auto sm:mb-3">
                <Inbox className="h-5 w-5" />
              </div>
              <div className="sm:text-center">
                <p className="text-sm font-medium text-slate-800">Review in dashboard</p>
                <p className="mt-0.5 text-xs text-slate-500 sm:mt-1">All leads in one place</p>
              </div>
            </div>
          </div>

          {/* Key benefits */}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Mark inquiries as read/unread</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Archive completed inquiries</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>Built-in spam protection</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Never miss a potential client</span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Ready to capture more leads?</span>
            </p>
            <Button asChild size="sm" className="w-full shrink-0 rounded-full sm:w-auto">
              <Link href="/dashboard/billing">
                Upgrade Now
              </Link>
            </Button>
          </div>
        </div>
      </div>
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
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-emerald-900">Contact form is active</p>
                <p className="text-sm text-emerald-700">
                  Families can reach you through your listing. Check your{" "}
                  <Link href="/dashboard/inbox" className="underline hover:no-underline">
                    Contact Form Inbox
                  </Link>{" "}
                  for inquiries.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <MessageSquare className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="font-medium text-slate-700">Contact form is disabled</p>
                <p className="text-sm text-slate-500">
                  Families will only see your contact information (email, phone, website).
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

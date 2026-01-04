import { Suspense } from "react";
import Link from "next/link";
import { ClipboardList, Mail, MessageSquare, Sparkles, ArrowRight, CheckCircle2, Bell, Inbox, Shield } from "lucide-react";

import { getInquiries } from "@/lib/actions/inquiries";
import { getLocations } from "@/lib/actions/locations";
import { getListingAttributes } from "@/lib/actions/listings";
import { getProfile } from "@/lib/supabase/server";
import { InquiriesList } from "@/components/dashboard/inquiries-list";
import { ContactFormToggle } from "@/components/dashboard/inbox/contact-form-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";

export default async function InquiriesPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Contact Form Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Manage messages from families interested in your services.
          </p>
        </div>

        <Card className="overflow-hidden border-slate-200">
          <BubbleBackground
            interactive={false}
            size="default"
            className="bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50"
            colors={{
              first: "255,255,255",
              second: "255,236,170",
              third: "135,176,255",
              fourth: "255,248,210",
              fifth: "190,210,255",
              sixth: "240,248,255",
            }}
          >
            <CardContent className="flex flex-col items-center py-12 px-6 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5788FF] shadow-lg shadow-[#5788FF]/25">
                <ClipboardList className="h-8 w-8 text-white" />
              </div>

              <h3 className="text-xl font-semibold text-slate-900">
                Complete Onboarding to Access Messages
              </h3>

              <p className="mt-3 max-w-md text-sm text-slate-600">
                Finish setting up your practice profile to unlock all dashboard features.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {["View inquiries", "Reply to families", "Track conversations"].map((benefit) => (
                  <span
                    key={benefit}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5788FF]" />
                    {benefit}
                  </span>
                ))}
              </div>

              <Button asChild size="lg" className="mt-8">
                <Link href="/dashboard/onboarding" className="gap-2">
                  Continue Onboarding
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </BubbleBackground>
        </Card>
      </div>
    );
  }

  // Check if user is on free plan - Messages is a premium feature
  // Must have paid plan AND active subscription
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const isFreePlan = profile.plan_tier === "free" || !isActiveSubscription;

  if (isFreePlan) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Contact Form Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Manage messages from families interested in your services.
          </p>
        </div>

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
      </div>
    );
  }

  // Fetch inquiries, locations, and attributes in parallel
  const [result, locationsResult, attributesResult] = await Promise.all([
    getInquiries(),
    getLocations(),
    getListingAttributes(),
  ]);

  if (!result.success) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Contact Form Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Manage messages from families interested in your services.
          </p>
        </div>

        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="flex items-center gap-3 py-4">
            <p className="text-sm text-destructive">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { inquiries, unreadCount } = result.data!;
  const locations = locationsResult.success && locationsResult.data
    ? locationsResult.data.map((loc) => ({
        id: loc.id,
        label: loc.label,
        city: loc.city,
        state: loc.state,
      }))
    : [];
  const contactFormEnabled = attributesResult.success
    ? (attributesResult.data?.contact_form_enabled as boolean) !== false
    : true;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 sm:gap-6 lg:overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Contact Form Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
            Manage messages from families interested in your services.
          </p>
        </div>
        <ContactFormToggle contactFormEnabled={contactFormEnabled} />
      </div>

      <Suspense
        fallback={
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <InquiriesList
          initialInquiries={inquiries}
          initialUnreadCount={unreadCount}
          locations={locations}
        />
      </Suspense>
    </div>
  );
}

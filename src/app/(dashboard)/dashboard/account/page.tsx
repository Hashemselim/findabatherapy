import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, Settings, User, ChevronRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUser, getProfile } from "@/lib/supabase/server";
import { getListing } from "@/lib/actions/listings";

export default async function AccountPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const [profile, listingResult] = await Promise.all([
    getProfile(),
    getListing(),
  ]);

  const listing = listingResult.success ? listingResult.data : null;
  const planTier = listing?.profile?.planTier || "free";
  const subscriptionStatus = listing?.profile?.subscriptionStatus;
  const isActiveSubscription = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const isPaidPlan = planTier !== "free" && isActiveSubscription;

  // Get display name
  const displayName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || null;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
          Manage your account settings and subscription.
        </p>
      </div>

      {/* Account Summary */}
      <Card className="border-border/60">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">
              {displayName || user.email}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant={isPaidPlan ? "default" : "secondary"}>
            {isPaidPlan
              ? planTier === "enterprise"
                ? "Enterprise"
                : "Pro"
              : "Free Plan"}
          </Badge>
        </CardContent>
      </Card>

      {/* Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/billing" className="group">
          <Card className="h-full border-border/60 transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base group-hover:text-primary">
                  Plan & Billing
                </CardTitle>
                <CardDescription>
                  Manage subscription and payment
                </CardDescription>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-sm text-muted-foreground">
                View your current plan, update payment methods, and manage your subscription.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/settings" className="group">
          <Card className="h-full border-border/60 transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Settings className="h-5 w-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base group-hover:text-primary">
                  Account Settings
                </CardTitle>
                <CardDescription>
                  View account information
                </CardDescription>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-sm text-muted-foreground">
                View your account details, linked sign-in methods, and security information.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

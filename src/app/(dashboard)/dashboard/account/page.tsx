import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, Settings, User, ChevronRight, Users } from "lucide-react";

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCallout, DashboardCard } from "@/components/dashboard/ui";
import { getProfile, getCurrentMembership } from "@/lib/platform/workspace/server";
import { getCurrentUser } from "@/lib/platform/auth/server";
import { getListing } from "@/lib/actions/listings";

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const [profile, listingResult] = await Promise.all([
    getProfile(),
    getListing(),
  ]);
  const membership = await getCurrentMembership();

  const listing = listingResult.success ? listingResult.data : null;
  const planTier = listing?.profile?.planTier || "free";
  const subscriptionStatus = listing?.profile?.subscriptionStatus;
  const isActiveSubscription = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const isPaidPlan = planTier !== "free" && isActiveSubscription;

  // Get display name
  const displayName = profile?.full_name || user.firstName || null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardPageHeader
        title="Account"
        description="Manage your account settings and subscription."
      />

      {/* Account Summary */}
      <DashboardCard>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">
              {displayName || user.email}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {profile && membership && (
              <p className="text-sm text-muted-foreground">
                {String(profile.agency_name || "Workspace")} · {membership.role}
              </p>
            )}
          </div>
          <Badge variant={isPaidPlan ? "default" : "secondary"}>
            {isPaidPlan ? "Pro" : "Free Plan"}
          </Badge>
        </CardContent>
      </DashboardCard>

      {membership?.role !== "owner" && (
        <DashboardCallout
          title="Billing managed by owner"
          description="Only the workspace owner can change the plan, purchase seats, or open the Stripe billing portal."
          icon={CreditCard}
          tone="default"
        />
      )}

      {/* Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href={membership?.role === "owner" ? "/dashboard/billing" : "/dashboard/settings/users"} className="group">
          <DashboardCard className="h-full transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base group-hover:text-primary">
                  {membership?.role === "owner" ? "Plan & Billing" : "Workspace Users"}
                </CardTitle>
                <CardDescription>
                  {membership?.role === "owner" ? "Manage subscription and payment" : "View shared account access"}
                </CardDescription>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-sm text-muted-foreground">
                {membership?.role === "owner"
                  ? "View your current plan, update payment methods, and manage your subscription."
                  : "See which users have access to the shared workspace and who can manage seats."}
              </p>
            </CardContent>
          </DashboardCard>
        </Link>

        <Link href="/dashboard/settings" className="group">
          <DashboardCard className="h-full transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Settings className="h-5 w-5" />
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
          </DashboardCard>
        </Link>

        <Link href="/dashboard/settings/users" className="group">
          <DashboardCard className="h-full transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base group-hover:text-primary">
                  Users & Seats
                </CardTitle>
                <CardDescription>
                  Shared account access
                </CardDescription>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-sm text-muted-foreground">
                Invite users, manage roles, and see how many account seats are in use.
              </p>
            </CardContent>
          </DashboardCard>
        </Link>
      </div>
    </div>
  );
}

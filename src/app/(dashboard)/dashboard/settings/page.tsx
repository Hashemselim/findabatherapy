import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, User, Shield, KeyRound, Users } from "lucide-react";

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard, DashboardCallout } from "@/components/dashboard/ui";
import { getProfile, getCurrentMembership } from "@/lib/platform/workspace/server";
import { getCurrentUser } from "@/lib/platform/auth/server";

// Provider icons as separate components for cleaner code
function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 23 23" aria-hidden>
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}

export default async function DashboardSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const profile = await getProfile();
  const membership = await getCurrentMembership();

  // Get all linked authentication methods from identities array
  const identities: Array<{ provider: string }> = [{ provider: "email" }];
  const userMetadata: Record<string, unknown> = {};
  const userCreatedAt: string | null = null;
  const emailConfirmedAt = new Date().toISOString();

  // Map provider names to display info
  const getProviderDisplay = (provider: string) => {
    switch (provider) {
      case "google":
        return { label: "Google", icon: <GoogleIcon /> };
      case "azure":
        return { label: "Microsoft", icon: <MicrosoftIcon /> };
      case "email":
      default:
        return { label: "Email & Password", icon: <KeyRound className="h-4 w-4 text-muted-foreground" /> };
    }
  };

  // Get unique providers (user may have multiple identities)
  const linkedProviders = identities.length > 0
    ? [...new Set(identities.map((id: { provider: string }) => id.provider))].map(getProviderDisplay)
    : [getProviderDisplay("email")]; // Fallback if no identities

  // Determine security note based on linked providers
  const hasOAuthProvider = identities.some((id: { provider: string }) => id.provider === "google" || id.provider === "azure");
  const hasEmailProvider = identities.some((id: { provider: string }) => id.provider === "email");

  const getSecurityNote = () => {
    if (hasOAuthProvider && hasEmailProvider) {
      return "Your account has multiple sign-in methods linked. You can use any of them to access your account.";
    }
    if (hasOAuthProvider) {
      return "Your account is secured through a third-party provider. Manage your password and security settings in that provider's account.";
    }
    return "Your account is protected with email and password authentication. Use a strong, unique password to keep your account secure.";
  };

  // Get display name from profile or user metadata
  const displayName = profile?.full_name || (userMetadata?.full_name as string) || (userMetadata?.name as string) || user.firstName || null;

  // Format account creation date
  const createdAt = userCreatedAt
    ? new Date(userCreatedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <DashboardPageHeader
        title="Account Settings"
        description="View your account information and sign-in details."
      />

      {/* Account Information Card */}
      <DashboardCard>
        <CardHeader className="border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <User className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your personal details and account settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Name */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground sm:w-32">
                <User className="h-4 w-4" />
                Name
              </div>
              <p className="text-sm text-foreground">
                {displayName || <span className="text-muted-foreground">Not set</span>}
              </p>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground sm:w-32">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-foreground">{user.email}</p>
                {emailConfirmedAt && (
                  <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                    Verified
                  </Badge>
                )}
              </div>
            </div>

            {/* Auth Methods */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground sm:w-32 sm:pt-0.5">
                <Shield className="h-4 w-4" />
                Sign-in {linkedProviders.length > 1 ? "Methods" : "Method"}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {linkedProviders.map((provider, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1">
                    {provider.icon}
                    <span className="text-sm text-foreground">{provider.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {profile && membership && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground sm:w-32">
                  <Users className="h-4 w-4" />
                  Workspace
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-foreground">{String(profile.agency_name || "Workspace")}</p>
                  <Badge variant="outline">{membership.role}</Badge>
                </div>
              </div>
            )}

            {/* Account Created */}
            {createdAt && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground sm:w-32">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Member Since
                </div>
                <p className="text-sm text-foreground">{createdAt}</p>
              </div>
            )}
          </div>
        </CardContent>
      </DashboardCard>

      {/* Security Note */}
      <DashboardCallout
        title="Account Security"
        description={getSecurityNote()}
        icon={Shield}
        tone="default"
      />

      {membership && membership.role !== "member" && (
        <DashboardCard>
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <CardTitle>Workspace Users</CardTitle>
            <CardDescription>
              Invite account users, manage roles, and track seat usage.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Button asChild variant="outline">
              <Link href="/dashboard/settings/users">Manage Users</Link>
            </Button>
          </CardContent>
        </DashboardCard>
      )}
    </div>
  );
}

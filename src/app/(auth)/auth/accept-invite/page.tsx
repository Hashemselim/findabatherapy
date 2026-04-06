import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceInviteDetails } from "@/lib/workspace/memberships";

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; email?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;
  const inviteError = params.error;
  const invite = token ? await getWorkspaceInviteDetails(token) : null;

  const nextHref = token && invite
    ? {
        signIn: `/auth/sign-in?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.invitedEmail)}`,
        signUp: `/auth/sign-up?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.invitedEmail)}`,
      }
    : {
        signIn: "/auth/sign-in",
        signUp: "/auth/sign-up",
      };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-4 text-center">
          <Badge className="mx-auto rounded-full bg-primary/10 text-primary">
            Workspace Invitation
          </Badge>
          <CardTitle className="text-3xl">Join a shared GoodABA workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {inviteError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4" />
                Invitation could not be accepted
              </div>
              {inviteError}
            </div>
          )}

          {!invite && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4" />
                Invitation not found
              </div>
              This invite link is missing or invalid.
            </div>
          )}

          {invite && (
            <>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Shared workspace access
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-foreground">{invite.agencyName}</p>
                  <p className="text-sm text-muted-foreground">
                    Sign in or create an account with <strong>{invite.invitedEmail}</strong> to join as an{" "}
                    <strong>{roleLabel(invite.role)}</strong>.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background p-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {invite.status === "pending" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  )}
                  <span>Status: {roleLabel(invite.status)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Expires{" "}
                    {new Date(invite.expiresAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {invite.status === "pending" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild className="rounded-full">
                    <Link href={nextHref.signIn}>Sign in to join</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href={nextHref.signUp}>Create account to join</Link>
                  </Button>
                </div>
              ) : (
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/auth/sign-in">Back to sign in</Link>
                </Button>
              )}

              {invite.status !== "pending" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  This invitation can no longer be accepted. Ask the workspace owner to send a new invite.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

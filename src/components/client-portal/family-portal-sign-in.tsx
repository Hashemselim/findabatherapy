"use client";

import { SignIn, SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function FamilyPortalSignIn({
  slug,
  callbackUrl,
  email,
}: {
  slug: string;
  callbackUrl: string;
  email?: string | null;
}) {
  return (
    <div className="w-full">
      <SignIn
        routing="path"
        path={`/portal/${slug}/sign-in`}
        forceRedirectUrl={callbackUrl}
        initialValues={email ? { emailAddress: email } : undefined}
      />
    </div>
  );
}

export function FamilyPortalSignOutButton() {
  return (
    <SignOutButton>
      <Button variant="outline" className="rounded-full">
        Sign out and switch account
      </Button>
    </SignOutButton>
  );
}

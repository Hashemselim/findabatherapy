import { PropsWithChildren } from "react";
import Link from "next/link";

import { AuthHeader } from "@/components/layout/auth-header";

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AuthHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      {/* Minimal footer for auth pages */}
      <footer className="border-t border-border/40 py-4">
        <div className="container flex items-center justify-center gap-4 px-4 text-center text-xs text-muted-foreground">
          <Link href="/legal/privacy" className="hover:text-foreground hover:underline">
            Privacy
          </Link>
          <span>·</span>
          <Link href="/legal/terms" className="hover:text-foreground hover:underline">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}

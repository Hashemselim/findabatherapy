import { PropsWithChildren } from "react";
import { headers } from "next/headers";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default async function SiteLayout({ children }: PropsWithChildren) {
  const requestHeaders = await headers();
  const isBehaviorWorkPage = requestHeaders.get("x-behaviorwork-page") === "1";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {!isBehaviorWorkPage && <SiteHeader />}
      <main className="flex-1">{children}</main>
      {!isBehaviorWorkPage && <SiteFooter />}
    </div>
  );
}

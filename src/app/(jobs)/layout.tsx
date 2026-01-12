import { PropsWithChildren } from "react";

import { JobsHeader } from "@/components/jobs/jobs-header";
import { JobsFooter } from "@/components/jobs/jobs-footer";

export default function JobsLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <JobsHeader />
      <main className="flex-1">{children}</main>
      <JobsFooter />
    </div>
  );
}

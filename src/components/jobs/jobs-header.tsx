import Link from "next/link";
import { Briefcase } from "lucide-react";

import { jobsConfig } from "@/config/jobs";
import { getUser } from "@/lib/supabase/server";
import { JobsHeaderClient } from "./jobs-header-client";

const primaryNav = [
  { href: "/jobs/search", label: "Search Jobs" },
  { href: "/employers", label: "Employers" },
];

export async function JobsHeader() {
  const user = await getUser();
  const isLoggedIn = !!user;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-10">
          <Link href="/jobs" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-foreground sm:text-xl">
              {jobsConfig.name}
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-base font-medium text-muted-foreground md:flex">
            {primaryNav.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <JobsHeaderClient isLoggedIn={isLoggedIn} primaryNav={primaryNav} />
      </div>
    </header>
  );
}

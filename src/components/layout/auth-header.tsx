import Link from "next/link";
import { Heart, Briefcase } from "lucide-react";

import { GoodABALogo } from "@/components/brand/goodaba-logo";

export function AuthHeader() {
  return (
    <div className="flex flex-col items-center gap-3 pb-2 pt-8 sm:pt-12">
      <Link
        href="/"
        className="transition-opacity hover:opacity-80"
        aria-label="GoodABA home"
      >
        <GoodABALogo size="xl" priority />
      </Link>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Heart className="h-3 w-3 text-[#0866FF]" />
          <span>findabatherapy.org</span>
        </span>
        <span className="text-border">·</span>
        <span className="flex items-center gap-1.5">
          <Briefcase className="h-3 w-3 text-[#10B981]" />
          <span>goodaba.com/jobs</span>
        </span>
      </div>
    </div>
  );
}

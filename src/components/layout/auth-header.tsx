import Link from "next/link";
import { Heart, Briefcase } from "lucide-react";

import { BehaviorWorkLogo } from "@/components/brand/behaviorwork-logo";

export function AuthHeader() {
  return (
    <div className="flex flex-col items-center gap-3 pb-2 pt-8 sm:pt-12">
      {/* Primary brand */}
      <Link
        href="/behaviorwork"
        className="transition-opacity hover:opacity-80"
        aria-label="BehaviorWork home"
      >
        <BehaviorWorkLogo size="xl" />
      </Link>

      {/* Sub-brands line */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Heart className="h-3 w-3 text-[#5788FF]" />
          <span>findabatherapy.org</span>
        </span>
        <span className="text-border">·</span>
        <span className="flex items-center gap-1.5">
          <Briefcase className="h-3 w-3 text-[#10B981]" />
          <span>findabajobs.org</span>
        </span>
      </div>
    </div>
  );
}

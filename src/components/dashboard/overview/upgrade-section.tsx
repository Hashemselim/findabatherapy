import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardCallout } from "@/components/dashboard/ui";

export function UpgradeSection() {
  return (
    <DashboardCallout
      tone="premium"
      icon={Sparkles}
      title="Boost your profile with Pro"
      description="Get priority search placement, direct contact forms, photo galleries, and analytics."
      action={(
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/dashboard/billing">
            See Pro benefits
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      )}
    />
  );
}

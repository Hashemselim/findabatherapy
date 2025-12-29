import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function UpgradeSection() {
  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary/20 p-3">
            <Sparkles className="h-6 w-6 text-[#5788FF]" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Boost your profile with Pro
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get priority search placement, direct contact forms, photo galleries, and analytics.
            </p>
          </div>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/dashboard/billing">
            See Pro benefits
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

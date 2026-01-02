import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DemoCTABanner() {
  return (
    <div
      data-tour="cta-banner"
      className="mt-8 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Ready to grow your practice?
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your free listing in minutes. Upgrade to Pro anytime.
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {["No credit card required", "Free plan available", "Cancel anytime"].map(
              (item) => (
                <li key={item} className="flex items-center gap-1">
                  <Check className="h-4 w-4 text-primary" />
                  {item}
                </li>
              )
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/get-listed">View Pricing</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link href="/auth/sign-up?plan=free&from=demo">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

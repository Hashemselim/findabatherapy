"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2, CheckCircle2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { upgradeToEnterprise } from "@/lib/stripe/actions";
import { STRIPE_PLANS } from "@/lib/stripe/config";

interface EnterpriseUpgradeCardProps {
  isAnnual: boolean;
}

export function EnterpriseUpgradeCard({ isAnnual }: EnterpriseUpgradeCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const price = isAnnual
    ? STRIPE_PLANS.enterprise.annual.price
    : STRIPE_PLANS.enterprise.monthly.price;

  const handleUpgrade = () => {
    setError(null);
    startTransition(async () => {
      const result = await upgradeToEnterprise(isAnnual ? "year" : "month");
      if (result.success) {
        setUpgradeSuccess(true);
        // Auto-redirect after showing success
        setTimeout(() => {
          router.refresh();
        }, 2500);
      } else {
        setError(result.error || "Failed to upgrade");
      }
    });
  };

  if (upgradeSuccess) {
    return (
      <Card className="overflow-hidden border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardContent className="flex flex-col items-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <p className="mt-4 text-lg font-medium text-foreground">
            Welcome to Enterprise!
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your plan has been upgraded. Enjoy unlimited locations and premium features.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-slate-50 to-white">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Left side - Info and features */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-3">
                <Crown className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Upgrade to Enterprise</h3>
                <p className="text-sm text-slate-500">
                  ${price}/mo {isAnnual && `(billed annually)`}
                </p>
              </div>
            </div>

            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {STRIPE_PLANS.enterprise.features.slice(0, 6).map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>

            {isAnnual && (
              <Badge className="mt-4 border-green-200 bg-green-50 text-green-700">
                Save 40% (${STRIPE_PLANS.enterprise.annual.savings}/year) with annual billing
              </Badge>
            )}
          </div>

          {/* Right side - CTA */}
          <div className="flex flex-col items-center gap-3 lg:items-end">
            <Button
              onClick={handleUpgrade}
              disabled={isPending}
              className="w-full gap-2 rounded-full sm:w-auto"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Upgrading...
                </>
              ) : (
                <>
                  Upgrade Now
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500">
              Prorated charge applied immediately
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

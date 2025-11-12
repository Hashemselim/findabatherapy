import { CreditCard, DollarSign } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function DashboardBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Billing & subscriptions</h1>
        <p className="mt-2 text-sm text-slate-300">
          Manage your Stripe subscription, upgrade to Featured placement, and download invoices.
        </p>
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              Current plan <Badge variant="secondary">Premium</Badge>
            </CardTitle>
            <CardDescription className="text-slate-300">
              Premium renews monthly via Stripe. Upgrade to Featured to secure top-of-state placement.
            </CardDescription>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
            Upgrade to Featured
            <DollarSign className="h-4 w-4" aria-hidden />
          </button>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              <span className="text-slate-200">Renewal date:</span> May 15, 2025
            </p>
            <p>
              <span className="text-slate-200">Billing cycle:</span> Monthly
            </p>
            <p>
              <span className="text-slate-200">Stripe subscription ID:</span> sub_01HXYZ
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            <p className="font-medium text-emerald-50">Featured placement benefits</p>
            <p className="mt-1">
              • Pinned to top of state results
              <br />
              • Rotating banner on homepage
              <br />
              • Monthly performance snapshots
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" aria-hidden />
            Payments managed securely through Stripe Checkout.
          </div>
          <button className="text-sm text-primary hover:underline">Manage payment method →</button>
        </CardFooter>
      </Card>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Invoice history</CardTitle>
          <CardDescription className="text-slate-300">
            Download past invoices directly from Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <div className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3">
            <span>Invoice #INV-2024-05</span>
            <div className="flex items-center gap-3">
              <span>$149.00</span>
              <button className="text-primary hover:underline">Download PDF</button>
            </div>
          </div>
          <Separator className="bg-white/10" />
          <div className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3">
            <span>Invoice #INV-2024-04</span>
            <div className="flex items-center gap-3">
              <span>$149.00</span>
              <button className="text-primary hover:underline">Download PDF</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardOnboardingPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary" className="uppercase">
          Step 1 of 3
        </Badge>
        <h1 className="mt-3 text-3xl font-semibold text-white">Welcome to Find ABA Therapy</h1>
        <p className="mt-2 text-sm text-slate-300">
          Create your agency account in minutes. You can publish a free listing or upgrade anytime for Premium and Featured exposure.
        </p>
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Choose your starting plan</CardTitle>
          <CardDescription className="text-slate-300">
            Plans can be upgraded or downgraded later. Premium requires Stripe Checkout; Featured is an add-on available after publishing.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm text-slate-200">
            <h3 className="text-lg font-semibold text-white">Free</h3>
            <p className="mt-1 text-xs text-slate-300">Basic listing with logo, contact info, and services.</p>
          </div>
          <div className="rounded-2xl border border-primary/40 bg-primary/[0.1] p-4 text-sm text-primary-foreground">
            <h3 className="text-lg font-semibold text-white">Premium</h3>
            <p className="mt-1 text-xs text-primary-foreground/80">Unlock media, enhanced visuals, and priority placement.</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            <h3 className="text-lg font-semibold text-white">Featured</h3>
            <p className="mt-1 text-xs text-emerald-100/80">Pinned to top results with sponsored banners. Add-on to any plan.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

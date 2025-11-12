import { planTiers } from "@/content/plans";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardUpgradePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Compare plans</h1>
        <p className="mt-2 text-sm text-slate-300">
          Choose the visibility tier that matches your growth goals. All plans include unlimited updates, analytics,
          and featured partner access.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {planTiers.map((plan) => (
          <Card key={plan.id} className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">{plan.name}</CardTitle>
              <CardDescription className="text-slate-300">{plan.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p className="text-lg font-semibold text-white">{plan.billing}</p>
              <ul className="space-y-1">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <button className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90">
                Choose {plan.name}
              </button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

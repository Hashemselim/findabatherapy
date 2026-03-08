import { planTiers } from "@/content/plans";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard, DashboardStatusBadge } from "@/components/dashboard/ui";

export default function DashboardUpgradePage() {
  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Compare Plans"
        description="Choose the visibility tier that matches your growth goals. All plans include unlimited updates, analytics, and featured partner access."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {planTiers.map((plan) => (
          <DashboardCard key={plan.id} tone={plan.highlight ? "premium" : "default"}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{plan.name}</CardTitle>
                {plan.highlight && <DashboardStatusBadge tone="premium">Recommended</DashboardStatusBadge>}
              </div>
              <CardDescription>{plan.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="text-lg font-semibold text-foreground">{plan.billing}</p>
              <ul className="space-y-1">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant={plan.highlight ? "default" : "outline-solid"}>
                Choose {plan.name}
              </Button>
            </CardFooter>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}

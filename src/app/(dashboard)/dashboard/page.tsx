import { ArrowUpRight, Sparkles, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const performanceCards = [
  {
    label: "Profile views",
    value: "1,284",
    change: "+18%",
  },
  {
    label: "Family inquiries",
    value: "76",
    change: "+12%",
  },
  {
    label: "Conversions",
    value: "19",
    change: "+6%",
  },
];

const onboardingSteps = [
  {
    title: "Complete company details",
    description: "Add description, services, insurances, and contact information.",
    status: "Complete",
  },
  {
    title: "Upload media",
    description: "Photos and videos unlock with Premium plan.",
    status: "Locked",
  },
  {
    title: "Enable featured placement",
    description: "Stay pinned at the top of {state} results and receive homepage banners.",
    status: "Available",
  },
];

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Badge variant="secondary" className="uppercase">
            Welcome back
          </Badge>
          <h1 className="mt-3 text-3xl font-semibold">Agency performance dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Manage your listing, upgrades, and partner offers from one streamlined hub. All updates go live instantly.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-white/10">
          Submit update
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {performanceCards.map((card) => (
          <Card key={card.label} className="border-white/10 bg-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 text-sm text-slate-300">
              <p>{card.label}</p>
              <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-white">{card.value}</div>
              <p className="text-xs text-emerald-300">{card.change} vs last 30 days</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="onboarding">
        <TabsList className="grid w-full grid-cols-3 bg-white/5">
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        <TabsContent value="onboarding" className="mt-6">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>TurboTax-style onboarding</CardTitle>
              <CardDescription>
                Follow the guided steps to complete your listing. Locked fields highlight opportunities to upgrade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {onboardingSteps.map((step) => (
                <div key={step.title} className="flex flex-col gap-1 rounded-2xl bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{step.title}</p>
                    <span className="text-xs uppercase text-slate-300">{step.status}</span>
                  </div>
                  <p className="text-xs text-slate-300">{step.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="updates" className="mt-6">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Recent updates</CardTitle>
              <CardDescription>All changes sync instantly to the public directory.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p>• Added new Phoenix clinic location.</p>
              <p>• Updated accepted insurances: Added TRICARE Prime.</p>
              <p>• Published spring 2025 social skills group.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="insights" className="mt-6">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Insights</CardTitle>
              <CardDescription>Premium and Featured tiers unlock detailed analytics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p>
                <Sparkles className="mr-2 inline h-4 w-4 text-primary" aria-hidden />
                Upgrade to Premium to see conversion funnels, referral sources, and search keywords families use to find
                you.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

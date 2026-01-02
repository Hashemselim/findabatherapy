"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, Users, FileText, MapPin, CreditCard, CheckCircle } from "lucide-react";
import type { CustomerConversionFunnel } from "@/lib/actions/admin";

interface AdminCustomerFunnelProps {
  data: CustomerConversionFunnel;
}

export function AdminCustomerFunnel({ data }: AdminCustomerFunnelProps) {
  const funnelSteps = [
    { label: "Signups", value: data.totalSignups, color: "bg-slate-500", icon: Users },
    { label: "Onboarded", value: data.completedOnboarding, color: "bg-blue-500", icon: CheckCircle },
    { label: "Created Listing", value: data.createdListing, color: "bg-cyan-500", icon: FileText },
    { label: "Added Location", value: data.addedLocation, color: "bg-teal-500", icon: MapPin },
    { label: "Published", value: data.publishedListing, color: "bg-green-500", icon: FileText },
    { label: "Paid", value: data.paidCustomers, color: "bg-purple-500", icon: CreditCard },
  ];

  const maxValue = Math.max(...funnelSteps.map((s) => s.value), 1);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Customer Journey Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Customer Journey Funnel
          </CardTitle>
          <CardDescription>Conversion through signup to paid customer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelSteps.map((step, index) => {
              const prevValue = index > 0 ? funnelSteps[index - 1].value : step.value;
              const conversionRate = prevValue > 0 ? ((step.value / prevValue) * 100).toFixed(0) : 0;
              const width = (step.value / maxValue) * 100;
              const Icon = step.icon;

              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 font-medium">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {step.label}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">{step.value.toLocaleString()}</span>
                      {index > 0 && (
                        <span className="text-xs text-muted-foreground">({conversionRate}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-6 w-full overflow-hidden rounded bg-muted">
                    <div
                      className={`h-full ${step.color} transition-all duration-500`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conversion Rates & Cohorts */}
      <div className="space-y-4">
        {/* Conversion Rates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conversion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {data.onboardingRate.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Onboarding Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-600">
                  {data.listingCreationRate.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Listing Creation</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {data.publishRate.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Publish Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {data.paidConversionRate.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Paid Conversion</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Signups */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{data.signupsLast7Days}</div>
                <div className="text-xs text-muted-foreground">Last 7 Days</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{data.signupsLast30Days}</div>
                <div className="text-xs text-muted-foreground">Last 30 Days</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{data.signupsLast90Days}</div>
                <div className="text-xs text-muted-foreground">Last 90 Days</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attention Required */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-amber-600">{data.staleAccounts}</div>
                <div className="text-xs text-muted-foreground">Stale Accounts</div>
                <div className="text-xs text-muted-foreground">(30+ days, no listing)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{data.incompleteOnboarding}</div>
                <div className="text-xs text-muted-foreground">Incomplete</div>
                <div className="text-xs text-muted-foreground">(has listing, no onboarding)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

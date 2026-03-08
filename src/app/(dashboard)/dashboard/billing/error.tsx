"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <DashboardCard tone="warning" className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <AlertTriangle className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            There was an issue loading this page. This may be temporary.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/clients/pipeline">Return to Dashboard</Link>
          </Button>
        </CardContent>
      </DashboardCard>
    </div>
  );
}

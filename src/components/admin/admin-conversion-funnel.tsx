"use client";

import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FunnelStep {
  label: string;
  value: number;
  color?: string;
}

interface AdminConversionFunnelProps {
  title: string;
  description?: string;
  steps: FunnelStep[];
  className?: string;
}

export function AdminConversionFunnel({
  title,
  description,
  steps,
  className,
}: AdminConversionFunnelProps) {
  const maxValue = Math.max(...steps.map((s) => s.value), 1);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          {steps.map((step, index) => {
            const prevValue = index > 0 ? steps[index - 1].value : step.value;
            const conversionRate = prevValue > 0 ? (step.value / prevValue) * 100 : 0;
            const widthPercent = (step.value / maxValue) * 100;

            return (
              <div key={step.label} className="flex flex-1 items-center gap-2">
                <div className="flex-1">
                  <div className="mb-1 text-center">
                    <div className="text-lg font-bold">{step.value.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{step.label}</div>
                  </div>
                  <div className="mx-auto h-8 overflow-hidden rounded bg-muted">
                    <div
                      className={cn("h-full rounded transition-all", step.color || "bg-primary")}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>

                {index < steps.length - 1 && (
                  <div className="flex flex-col items-center px-1">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="mt-1 text-xs font-medium text-muted-foreground">
                      {conversionRate.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface CompactFunnelProps {
  steps: { label: string; value: number }[];
}

export function CompactConversionFunnel({ steps }: CompactFunnelProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {steps.map((step, index) => {
        const prevValue = index > 0 ? steps[index - 1].value : step.value;
        const conversionRate = prevValue > 0 ? (step.value / prevValue) * 100 : 0;

        return (
          <div key={step.label} className="flex items-center gap-3">
            <div className="text-center">
              <div className="font-bold">{step.value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{step.label}</div>
            </div>
            {index < steps.length - 1 && (
              <div className="flex flex-col items-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{conversionRate.toFixed(0)}%</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

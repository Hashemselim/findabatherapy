"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClickThroughRateCardProps {
  currentCTR: number;
  previousCTR?: number;
  industryAverage?: number;
  className?: string;
}

export function ClickThroughRateCard({
  currentCTR,
  previousCTR,
  industryAverage = 5.5,
  className,
}: ClickThroughRateCardProps) {
  // Calculate change from previous period
  const change = previousCTR !== undefined ? currentCTR - previousCTR : null;
  const changePercent = change !== null ? change.toFixed(1) : null;
  const isPositive = change !== null && change >= 0;

  // Calculate performance vs industry average
  const vsAverage = ((currentCTR - industryAverage) / industryAverage) * 100;
  const aboveAverage = vsAverage > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Click-through Rate</CardTitle>
        <CardDescription>
          Percentage of search impressions that resulted in a click
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{currentCTR.toFixed(1)}%</span>
          {changePercent !== null && (
            <Badge
              variant="secondary"
              className={isPositive ? "text-emerald-600" : "text-red-600"}
            >
              {isPositive ? "+" : ""}
              {changePercent}% vs last period
            </Badge>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Industry average is {industryAverage}%.{" "}
          {aboveAverage ? (
            <>
              Your listing is performing{" "}
              <strong className="text-emerald-600">
                {Math.abs(vsAverage).toFixed(0)}% above average
              </strong>
              .
            </>
          ) : (
            <>
              Your listing is{" "}
              <strong className="text-amber-600">
                {Math.abs(vsAverage).toFixed(0)}% below average
              </strong>
              .
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

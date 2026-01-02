"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AdminMetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

export function AdminMetricCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  className,
  valueClassName,
}: AdminMetricCardProps) {
  const displayValue = typeof value === "number" ? value.toLocaleString() : value;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueClassName)}>{displayValue}</div>
        {(subtitle || trend !== undefined) && (
          <div className="mt-1 flex items-center gap-2">
            {trend !== undefined && (
              <span
                className={cn(
                  "flex items-center text-xs font-medium",
                  trend > 0 && "text-green-600",
                  trend < 0 && "text-red-600",
                  trend === 0 && "text-muted-foreground"
                )}
              >
                {trend > 0 ? (
                  <TrendingUp className="mr-0.5 h-3 w-3" />
                ) : trend < 0 ? (
                  <TrendingDown className="mr-0.5 h-3 w-3" />
                ) : (
                  <Minus className="mr-0.5 h-3 w-3" />
                )}
                {trend > 0 ? "+" : ""}
                {trend.toFixed(1)}%
              </span>
            )}
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
            {trendLabel && <span className="text-xs text-muted-foreground">{trendLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AdminMetricCardWithBreakdownProps {
  title: string;
  value: number;
  breakdown: { label: string; value: number; color?: string }[];
  icon?: React.ReactNode;
}

export function AdminMetricCardWithBreakdown({
  title,
  value,
  breakdown,
  icon,
}: AdminMetricCardWithBreakdownProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="mt-2 space-y-1">
          {breakdown.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className={cn("font-medium", item.color)}>{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

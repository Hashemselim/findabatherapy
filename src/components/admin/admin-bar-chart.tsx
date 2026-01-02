"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

interface AdminBarChartProps {
  title: string;
  description?: string;
  data: BarChartItem[];
  maxItems?: number;
  className?: string;
  horizontal?: boolean;
}

export function AdminBarChart({
  title,
  description,
  data,
  maxItems = 10,
  className,
  horizontal = true,
}: AdminBarChartProps) {
  const displayData = data.slice(0, maxItems);
  const maxValue = Math.max(...displayData.map((d) => d.value), 1);

  if (horizontal) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {displayData.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No data available</p>
          ) : (
            <div className="space-y-3">
              {displayData.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{item.label}</span>
                    <span className="ml-2 text-muted-foreground">{item.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        item.color || "bg-primary"
                      )}
                      style={{ width: `${(item.value / maxValue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Vertical bar chart
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {displayData.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No data available</p>
        ) : (
          <div className="flex h-48 items-end gap-2">
            {displayData.map((item) => (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{item.value}</span>
                <div className="w-full flex-1">
                  <div
                    className={cn("w-full rounded-t", item.color || "bg-primary")}
                    style={{
                      height: `${(item.value / maxValue) * 100}%`,
                      minHeight: item.value > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <span className="truncate text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AdminProgressBarProps {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
  showPercentage?: boolean;
}

export function AdminProgressBar({
  label,
  value,
  maxValue,
  color = "bg-primary",
  showPercentage = true,
}: AdminProgressBarProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value.toLocaleString()}
          {showPercentage && <span className="ml-1">({percentage.toFixed(1)}%)</span>}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

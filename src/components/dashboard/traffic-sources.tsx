"use client";

import { Globe, Search, Map, Home } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TrafficSourcesProps {
  sources: Array<{ source: string; count: number }>;
}

const SOURCE_CONFIG: Record<
  string,
  { label: string; icon: typeof Globe; color: string }
> = {
  search: { label: "Search Results", icon: Search, color: "bg-blue-500" },
  direct: { label: "Direct Visit", icon: Globe, color: "bg-purple-500" },
  state_page: { label: "State Page", icon: Map, color: "bg-emerald-500" },
  homepage: { label: "Homepage", icon: Home, color: "bg-amber-500" },
};

export function TrafficSources({ sources }: TrafficSourcesProps) {
  const total = sources.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic Sources</CardTitle>
        <CardDescription>Where your visitors come from</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No traffic data yet</p>
        ) : (
          sources.map((source) => {
            const config = SOURCE_CONFIG[source.source] || {
              label: source.source,
              icon: Globe,
              color: "bg-gray-500",
            };
            const Icon = config.icon;
            const percentage = total > 0 ? (source.count / total) * 100 : 0;

            return (
              <div key={source.source} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{config.label}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {source.count.toLocaleString()} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", config.color)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function TrafficSourcesSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="mt-2 h-4 w-48 rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-16 rounded bg-muted" />
            </div>
            <div className="h-2 w-full rounded-full bg-muted" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

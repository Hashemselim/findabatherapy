import { ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BehaviorWorkLane } from "@/content/behaviorwork";
import { cn } from "@/lib/utils";

interface BehaviorWorkFunnelVisualProps {
  lanes: BehaviorWorkLane[];
}

export function BehaviorWorkFunnelVisual({ lanes }: BehaviorWorkFunnelVisualProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {lanes.map((lane) => (
        <Card key={lane.title} className={cn("border", lane.borderClass, lane.colorClass)}>
          <CardHeader className="space-y-1 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{lane.subtitle}</p>
            <CardTitle className="text-lg">{lane.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {lane.steps.map((step, index) => (
                <li key={step} className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-white/90 px-3 py-2 text-sm font-medium text-foreground">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                  {index < lane.steps.length - 1 && (
                    <div className="flex justify-center">
                      <ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground/70" aria-hidden />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

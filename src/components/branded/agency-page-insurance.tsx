import { Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface AgencyPageInsuranceProps {
  insurances: string[];
  brandColor?: string;
}

// Helper to create a lighter shade of the brand color
function getLighterShade(hexColor: string, opacity: number = 0.1) {
  return `${hexColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

export function AgencyPageInsurance({ insurances, brandColor = "#5788FF" }: AgencyPageInsuranceProps) {
  if (insurances.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-foreground sm:text-2xl">
        Insurance We Accept
      </h2>
      <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
        <div className="flex flex-wrap gap-2">
          {insurances.map((insurance) => (
            <Badge
              key={insurance}
              variant="outline"
              className="gap-1.5 rounded-full px-4 py-2 text-sm transition-colors"
              style={{ borderColor: getLighterShade(brandColor, 0.3) }}
            >
              <Shield className="h-3.5 w-3.5" style={{ color: brandColor }} />
              {insurance}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );
}

import { BadgeCheck, Sparkles } from "lucide-react";

import { ProviderLogo } from "@/components/provider/provider-logo";
import { Badge } from "@/components/ui/badge";

interface AgencyPageHeroProps {
  agencyName: string;
  headline: string | null;
  logoUrl: string | null;
  isAcceptingClients: boolean;
  isPremium: boolean;
}

export function AgencyPageHero({
  agencyName,
  headline,
  logoUrl,
  isAcceptingClients,
  isPremium,
}: AgencyPageHeroProps) {
  const defaultHeadline = "Compassionate ABA Therapy for Your Family";

  return (
    <section className="w-full bg-gradient-to-br from-[#5788FF]/[0.06] via-white to-[#5788FF]/[0.04] py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <ProviderLogo
            name={agencyName}
            logoUrl={logoUrl ?? undefined}
            size="lg"
            className="mb-6"
          />

          {/* Badges */}
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            {isPremium && (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-500/50 bg-emerald-50 text-emerald-700"
              >
                <BadgeCheck className="h-3 w-3" />
                Verified Provider
              </Badge>
            )}
            {isAcceptingClients && (
              <Badge
                variant="outline"
                className="gap-1 border-primary/50 bg-primary/20 text-foreground"
              >
                <Sparkles className="h-3 w-3 text-amber-600" />
                Accepting New Clients
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {agencyName}
          </h1>

          <p className="mt-3 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            {headline || defaultHeadline}
          </p>
        </div>
      </div>
    </section>
  );
}

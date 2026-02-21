import { Badge } from "@/components/ui/badge";

interface AgencyPageServicesProps {
  agesServed?: { min?: number; max?: number } | null;
  languages: string[];
  diagnoses: string[];
  clinicalSpecialties: string[];
  serviceModes: string[];
  brandColor?: string;
}

const SERVICE_MODE_LABELS: Record<string, string> = {
  in_home: "In-Home Services",
  in_center: "Center-Based",
  telehealth: "Telehealth",
  school_based: "School-Based",
};

// Helper to create a lighter shade of the brand color
function getLighterShade(hexColor: string, opacity: number = 0.1) {
  return `${hexColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

export function AgencyPageServices({
  agesServed,
  languages,
  diagnoses,
  clinicalSpecialties,
  serviceModes,
  brandColor = "#5788FF",
}: AgencyPageServicesProps) {
  const hasAnyData =
    (agesServed && (agesServed.min !== undefined || agesServed.max !== undefined)) ||
    languages.length > 0 ||
    diagnoses.length > 0 ||
    clinicalSpecialties.length > 0 ||
    serviceModes.length > 0;

  if (!hasAnyData) return null;

  return (
    <section>
      <div className="space-y-8">
        {/* Services Offered */}
        {serviceModes.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-foreground sm:text-2xl">
              Our Services
            </h2>
            <div className="flex flex-wrap gap-2">
              {serviceModes.map((mode) => (
                <Badge
                  key={mode}
                  variant="outline"
                  className="rounded-full px-4 py-2 text-sm transition-colors"
                  style={{ borderColor: getLighterShade(brandColor, 0.3) }}
                >
                  {SERVICE_MODE_LABELS[mode] || mode}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Who We Serve */}
        {(agesServed || languages.length > 0 || diagnoses.length > 0) && (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-foreground sm:text-2xl">
              Who We Serve
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agesServed && (agesServed.min !== undefined || agesServed.max !== undefined) && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ages Served
                  </p>
                  <p className="text-lg font-medium text-foreground">
                    {agesServed.min ?? 0} - {(agesServed.max ?? 18) === 99 ? "99+" : agesServed.max ?? 18} years
                  </p>
                </div>
              )}

              {languages.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Languages Spoken
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {languages.map((lang) => (
                      <Badge key={lang} variant="secondary" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {diagnoses.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:col-span-2 lg:col-span-1">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Diagnoses Supported
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {diagnoses.map((d) => (
                      <Badge key={d} variant="outline" className="text-xs">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Our Specialties */}
        {clinicalSpecialties.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-foreground sm:text-2xl">
              Our Specialties
            </h2>
            <div className="flex flex-wrap gap-2">
              {clinicalSpecialties.map((specialty) => (
                <Badge
                  key={specialty}
                  variant="outline"
                  className="rounded-full px-4 py-2 text-sm transition-colors"
                  style={{ borderColor: getLighterShade(brandColor, 0.3) }}
                >
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

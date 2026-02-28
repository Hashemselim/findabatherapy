"use client";

import {
  Home,
  Building2,
  Monitor,
  Brain,
  Users,
  Languages,
  Baby,
  Stethoscope,
  Star,
} from "lucide-react";
import { useWebsite } from "../../layout/website-provider";
import { SectionDivider } from "./section-divider";

const SERVICE_MODE_CONFIG: Record<
  string,
  { label: string; description: string; icon: typeof Home }
> = {
  in_home: {
    label: "In-Home",
    description: "Therapy in the comfort of your home",
    icon: Home,
  },
  center_based: {
    label: "Center-Based",
    description: "At our professional therapy center",
    icon: Building2,
  },
  telehealth: {
    label: "Telehealth",
    description: "Remote therapy sessions online",
    icon: Monitor,
  },
  school: {
    label: "School-Based",
    description: "Therapy at your child's school",
    icon: Building2,
  },
  community: {
    label: "Community-Based",
    description: "Therapy in community settings",
    icon: Users,
  },
};

export function ModernServices() {
  const { provider, brandColor } = useWebsite();

  const serviceModes = provider.serviceModes || [];
  const clinicalSpecialties =
    (provider.attributes.clinical_specialties as string[]) || [];
  const diagnoses = (provider.attributes.diagnoses as string[]) || [];
  const languages = (provider.attributes.languages as string[]) || [];
  const agesServed = provider.attributes.ages_served as
    | { min?: number; max?: number }
    | undefined;

  const hasContent =
    serviceModes.length > 0 ||
    clinicalSpecialties.length > 0 ||
    diagnoses.length > 0 ||
    languages.length > 0 ||
    agesServed;

  if (!hasContent) return null;

  return (
    <section id="services" className="relative pb-20 pt-16 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
      {/* Brand gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${brandColor} 0%, ${brandColor} 15%, ${brandColor}ee 60%, ${brandColor}dd 100%)`,
        }}
      />

      {/* Decorative circles — matching hero's playful feel */}
      <div
        className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-10"
        style={{ backgroundColor: "white" }}
      />
      <div
        className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full opacity-8"
        style={{ backgroundColor: "white" }}
      />

      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header — white text on brand bg */}
        <div className="mb-12 text-center sm:mb-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <Star className="h-3.5 w-3.5" />
            Our Services
          </span>
          <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
            How We Can Help Your Family
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Comprehensive ABA therapy services tailored to your child&apos;s
            unique needs and goals.
          </p>
        </div>

        {/* Service Modes Cards — semi-transparent white on brand bg */}
        {serviceModes.length > 0 && (
          <div className="mb-14">
            <div
              className={`grid gap-4 ${
                serviceModes.length === 1
                  ? "max-w-sm mx-auto"
                  : serviceModes.length === 2
                    ? "max-w-2xl mx-auto sm:grid-cols-2"
                    : "sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {serviceModes.map((mode) => {
                const config = SERVICE_MODE_CONFIG[mode];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <div
                    key={mode}
                    className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/15 hover:shadow-lg"
                  >
                    <div className="mb-4 inline-flex rounded-xl bg-white/20 p-3 transition-all duration-300 group-hover:scale-110">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="mb-1.5 text-lg font-semibold text-white">
                      {config.label}
                    </h3>
                    <p className="text-sm text-white/70">
                      {config.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info Grid: Specialties, Diagnoses, Ages, Languages */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Clinical Specialties */}
          {clinicalSpecialties.length > 0 && (
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white/15">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="rounded-lg bg-white/20 p-2">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Clinical Specialties
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {clinicalSpecialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white/90"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Diagnoses */}
          {diagnoses.length > 0 && (
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white/15">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="rounded-lg bg-white/20 p-2">
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Diagnoses We Treat
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {diagnoses.map((d) => (
                  <span
                    key={d}
                    className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white/90"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ages Served */}
          {agesServed && (
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white/15">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="rounded-lg bg-white/20 p-2">
                  <Baby className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Ages Served
                </h3>
              </div>
              <p className="text-2xl font-bold text-white">
                {agesServed.min ?? 0} — {agesServed.max ?? 21}{" "}
                <span className="text-base font-normal text-white/70">
                  years old
                </span>
              </p>
            </div>
          )}

          {/* Languages */}
          {languages.length > 0 && (
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white/15">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="rounded-lg bg-white/20 p-2">
                  <Languages className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Languages Spoken
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {languages.map((l) => (
                  <span
                    key={l}
                    className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white/90"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Curved bottom divider — solid brand line, fills into white insurance section */}
      <SectionDivider
        variant="swoopLeft"
        lineStyle="solid"
        fillColor="white"
      />
    </section>
  );
}

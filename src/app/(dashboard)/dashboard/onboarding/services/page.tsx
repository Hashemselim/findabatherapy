"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Globe,
  Loader2,
  Sparkles,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateListingDetails, updatePremiumAttributes, getOnboardingData } from "@/lib/actions/onboarding";
import {
  DIAGNOSIS_OPTIONS,
  LANGUAGE_OPTIONS,
  SERVICES_OFFERED_OPTIONS,
  SPECIALTY_OPTIONS,
} from "@/lib/validations/onboarding";

const AGE_OPTIONS = Array.from({ length: 100 }, (_, index) => index);

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export default function OnboardingServicesPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listingSnapshot, setListingSnapshot] = useState<{
    headline: string | null;
    description: string | null;
    serviceModes: string[];
  } | null>(null);
  const [formData, setFormData] = useState({
    servicesOffered: ["aba"] as string[],
    agesServedMin: 0,
    agesServedMax: 21,
    languages: [] as string[],
    diagnoses: [] as string[],
    clinicalSpecialties: [] as string[],
    videoUrl: "",
  });

  useEffect(() => {
    async function loadData() {
      const result = await getOnboardingData();
      if (result.success && result.data) {
        const attrs = result.data.attributes;
        const agesServed = attrs.ages_served as { min?: number; max?: number } | undefined;

        setListingSnapshot({
          headline: result.data.listing?.headline || "",
          description: result.data.listing?.description || "",
          serviceModes: result.data.listing?.serviceModes || [],
        });

        setFormData({
          servicesOffered: (attrs.services_offered as string[]) || ["aba"],
          agesServedMin: agesServed?.min ?? 0,
          agesServedMax: agesServed?.max ?? 21,
          languages: (attrs.languages as string[]) || [],
          diagnoses: (attrs.diagnoses as string[]) || [],
          clinicalSpecialties: (attrs.clinical_specialties as string[]) || [],
          videoUrl: result.data.listing?.videoUrl || "",
        });
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  function toggleValue(field: "servicesOffered" | "languages" | "diagnoses" | "clinicalSpecialties", value: string) {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  }

  function handleContinue() {
    if (formData.servicesOffered.length === 0) {
      setError("Select at least one service offering.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const detailsResult = await updateListingDetails({
        headline: listingSnapshot?.headline || "",
        description: listingSnapshot?.description || "",
        serviceModes:
          (listingSnapshot?.serviceModes as ("in_home" | "in_center" | "telehealth" | "hybrid")[] | undefined) ||
          [],
        servicesOffered: formData.servicesOffered,
      });

      if (!detailsResult.success) {
        setError(detailsResult.error);
        return;
      }

      const premiumResult = await updatePremiumAttributes({
        agesServedMin: formData.agesServedMin,
        agesServedMax: formData.agesServedMax,
        languages: formData.languages,
        diagnoses: formData.diagnoses,
        clinicalSpecialties: formData.clinicalSpecialties,
        videoUrl: formData.videoUrl,
      });

      if (!premiumResult.success) {
        setError(premiumResult.error);
        return;
      }

      router.push("/dashboard/onboarding/branded-preview");
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#1A2744]" />
          <p className="text-sm text-slate-400">Loading service details...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Page header */}
      <motion.div variants={fadeUp} className="mb-8">
        <p className="mb-2 text-sm font-medium text-slate-400">Step 4 of 7</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1A2744] sm:text-4xl">
          What care do you provide?
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-500">
          These details power your listing filters, branded pages, and help families find the right match.
        </p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </motion.div>
      )}

      <div className="space-y-6">
        {/* Services offered */}
        <motion.section
          variants={fadeUp}
          className="space-y-4 rounded-2xl border border-amber-200/60 bg-white p-4 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
              <Sparkles className="h-4.5 w-4.5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1A2744]">Services offered</h2>
              <p className="text-sm text-slate-600">Select everything your agency actively delivers.</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {SERVICES_OFFERED_OPTIONS.map((service) => {
              const isSelected = formData.servicesOffered.includes(service.value);
              return (
                <label
                  key={service.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                    isSelected
                      ? "border-violet-200 bg-violet-50/50 text-[#1A2744]"
                      : "border-amber-200/60 bg-[#FFFBF0] text-slate-500 hover:border-amber-200/70"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleValue("servicesOffered", service.value)}
                  />
                  <span className="text-sm font-medium">{service.label}</span>
                </label>
              );
            })}
          </div>
        </motion.section>

        {/* Ages served + Languages - side by side on desktop */}
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.section
            variants={fadeUp}
            className="space-y-4 rounded-2xl border border-amber-200/60 bg-white p-4 sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Users className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#1A2744]">Ages served</h2>
                <p className="text-sm text-slate-600">Age range families should expect.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                className="h-11 flex-1 rounded-xl border border-amber-200/60 bg-[#FFFBF0] px-3 text-sm text-[#1A2744] focus:border-[#1A2744]/30 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1A2744]/5"
                value={formData.agesServedMin}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, agesServedMin: Number(event.target.value) }))
                }
              >
                {AGE_OPTIONS.map((age) => (
                  <option key={age} value={age}>
                    {age} {age === 0 ? "(birth)" : age === 1 ? "year" : "years"}
                  </option>
                ))}
              </select>
              <span className="text-sm font-medium text-slate-400">to</span>
              <select
                className="h-11 flex-1 rounded-xl border border-amber-200/60 bg-[#FFFBF0] px-3 text-sm text-[#1A2744] focus:border-[#1A2744]/30 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1A2744]/5"
                value={formData.agesServedMax}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, agesServedMax: Number(event.target.value) }))
                }
              >
                {AGE_OPTIONS.map((age) => (
                  <option key={age} value={age}>
                    {age} {age === 1 ? "year" : "years"}
                  </option>
                ))}
              </select>
            </div>
          </motion.section>

          <motion.section
            variants={fadeUp}
            className="space-y-4 rounded-2xl border border-amber-200/60 bg-white p-4 sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <Globe className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#1A2744]">Languages</h2>
                <p className="text-sm text-slate-600">Languages your team speaks.</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {LANGUAGE_OPTIONS.map((language) => {
                const isSelected = formData.languages.includes(language);
                return (
                  <label
                    key={language}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                      isSelected
                        ? "border-emerald-200 bg-emerald-50/50 text-[#1A2744]"
                        : "border-amber-200/60 bg-[#FFFBF0] text-slate-500 hover:border-amber-200/70"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleValue("languages", language)}
                    />
                    <span className="truncate">{language}</span>
                  </label>
                );
              })}
            </div>
          </motion.section>
        </div>

        {/* Diagnoses */}
        <motion.section
          variants={fadeUp}
          className="space-y-4 rounded-2xl border border-amber-200/60 bg-white p-4 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
              <Stethoscope className="h-4.5 w-4.5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1A2744]">Diagnoses supported</h2>
              <p className="text-sm text-slate-600">Select diagnoses your team is experienced with.</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DIAGNOSIS_OPTIONS.map((diagnosis) => {
              const isSelected = formData.diagnoses.includes(diagnosis);
              return (
                <label
                  key={diagnosis}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                    isSelected
                      ? "border-rose-200 bg-rose-50/50 text-[#1A2744]"
                      : "border-amber-200/60 bg-[#FFFBF0] text-slate-500 hover:border-amber-200/70"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleValue("diagnoses", diagnosis)}
                  />
                  <span className="truncate">{diagnosis}</span>
                </label>
              );
            })}
          </div>
        </motion.section>

        {/* Clinical specialties */}
        <motion.section
          variants={fadeUp}
          className="space-y-4 rounded-2xl border border-amber-200/60 bg-white p-4 sm:p-6"
        >
          <div>
            <h2 className="text-base font-semibold text-[#1A2744]">Clinical specialties</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Focus areas families and referrers should know about.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SPECIALTY_OPTIONS.map((specialty) => {
              const isSelected = formData.clinicalSpecialties.includes(specialty);
              return (
                <label
                  key={specialty}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                    isSelected
                      ? "border-[#1A2744]/15 bg-[#1A2744]/3 text-[#1A2744]"
                      : "border-amber-200/60 bg-[#FFFBF0] text-slate-500 hover:border-amber-200/70"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleValue("clinicalSpecialties", specialty)}
                  />
                  <span className="truncate">{specialty}</span>
                </label>
              );
            })}
          </div>
        </motion.section>

        {/* Intro video */}
        <motion.section
          variants={fadeUp}
          className="space-y-4 rounded-2xl border border-amber-200/60 bg-white p-4 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
              <Video className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1A2744]">Intro video</h2>
              <p className="text-sm text-slate-600">
                Optional. Add a YouTube or Vimeo link for your branded pages.
              </p>
            </div>
          </div>
          <Label htmlFor="videoUrl" className="sr-only">
            Video URL
          </Label>
          <Input
            id="videoUrl"
            placeholder="https://www.youtube.com/watch?v=..."
            value={formData.videoUrl}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, videoUrl: event.target.value }))
            }
            className="h-11 rounded-xl border-amber-200/60 bg-[#FFFBF0] focus:bg-white"
          />
        </motion.section>

        {/* Navigation footer */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col gap-3 rounded-2xl border border-amber-200/60 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
        >
          <p className="text-xs text-slate-500 sm:text-sm sm:text-slate-600">
            At least one service is required.
          </p>

          <Button
            type="button"
            size="lg"
            className="h-11 w-full shrink-0 rounded-full bg-[#0866FF] px-7 font-semibold text-white shadow-md shadow-[#0866FF]/25 hover:bg-[#0866FF]/92 sm:ml-auto sm:w-auto"
            disabled={isPending}
            onClick={handleContinue}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

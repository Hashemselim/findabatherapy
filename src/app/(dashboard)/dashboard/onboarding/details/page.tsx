"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, Globe, Loader2, Mail, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BrandColorPicker } from "@/components/dashboard/brand-color-picker";
import { LogoUploader } from "@/components/dashboard/logo-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateIntakeFormSettings } from "@/lib/actions/intake";
import {
  getOnboardingData,
  saveOnboardingDraft,
  updateListingDetails,
  updateProfileBasics,
} from "@/lib/actions/onboarding";

const detailsSchema = z.object({
  agencyName: z.string().min(2, "Agency name must be at least 2 characters"),
  headline: z.string().max(150, "Tagline must be less than 150 characters").optional().or(z.literal("")),
  description: z.string().min(50, "Description must be at least 50 characters"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  contactPhone: z.string().optional().or(z.literal("")),
  contactEmail: z.string().email("Please enter a valid email address"),
});

type DetailsFormData = z.infer<typeof detailsSchema>;

const DEFAULT_BRAND_COLOR = "#0866FF";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export default function OnboardingDetailsPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND_COLOR);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      agencyName: "",
      headline: "",
      description: "",
      website: "",
      contactPhone: "",
      contactEmail: "",
    },
  });

  const agencyName = watch("agencyName");
  const headline = watch("headline");
  const description = watch("description");
  const contactEmail = watch("contactEmail");
  const contactPhone = watch("contactPhone");
  const website = watch("website");

  useEffect(() => {
    async function loadData() {
      const result = await getOnboardingData();

      if (result.success && result.data) {
        const agencyNameValue = result.data.profile?.agencyName || "";

        reset({
          agencyName: agencyNameValue,
          headline: result.data.listing?.headline || "",
          description: result.data.listing?.description || "",
          website: result.data.profile?.website || "",
          contactPhone: result.data.profile?.contactPhone || "",
          contactEmail: result.data.profile?.contactEmail || "",
        });

        setLogoUrl(result.data.listing?.logoUrl || null);
        setBrandColor(result.data.profile?.brandColor || DEFAULT_BRAND_COLOR);

        if (!result.data.listing?.id && agencyNameValue) {
          await saveOnboardingDraft({
            agencyName: agencyNameValue,
            contactEmail: result.data.profile?.contactEmail || "",
            headline: result.data.listing?.headline || "",
            description: result.data.listing?.description || "",
          });

          const refreshed = await getOnboardingData();
          if (refreshed.success && refreshed.data?.listing?.logoUrl !== undefined) {
            setLogoUrl(refreshed.data.listing.logoUrl || null);
          }
        }
      }

      setIsLoading(false);
    }

    loadData();
  }, [reset]);

  function onSubmit(data: DetailsFormData) {
    setError(null);

    startTransition(async () => {
      const profileResult = await updateProfileBasics({
        agencyName: data.agencyName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || undefined,
        website: data.website || undefined,
      });

      if (!profileResult.success) {
        setError(profileResult.error);
        return;
      }

      const listingResult = await updateListingDetails({
        headline: data.headline || "",
        description: data.description,
        serviceModes: [],
      });

      if (!listingResult.success) {
        setError(listingResult.error);
        return;
      }

      router.push("/dashboard/onboarding/location");
    });
  }

  async function handleBrandColorChange(color: string) {
    setBrandColor(color);
    const result = await updateIntakeFormSettings({ background_color: color });
    if (!result.success) {
      setError(result.error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-foreground" />
          <p className="text-sm text-muted-foreground">Loading your agency details...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="min-w-0">
      {/* Page header */}
      <motion.div variants={fadeUp} className="mb-8">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Step 2 of 7</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Tell us about your agency
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
          This info shapes your listing, branded pages, and dashboard. You can always refine later.
        </p>
      </motion.div>

      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-4 sm:space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}

          {/* Agency Basics */}
          <motion.section
            variants={fadeUp}
            className="space-y-5 rounded-2xl border border-border/60 bg-card p-4 sm:p-6"
          >
            <div>
              <h2 className="text-lg font-semibold text-foreground">Agency basics</h2>
              <p className="mt-1 text-sm text-muted-foreground">How families will first see you.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agencyName">Agency name</Label>
                <Input
                  id="agencyName"
                  placeholder="e.g. BrightPath ABA"
                  {...register("agencyName")}
                  className="h-11 border-border/60 bg-muted/50 focus:bg-card"
                />
                {errors.agencyName && <p className="text-sm text-destructive">{errors.agencyName.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="headline">Tagline</Label>
                  <span className="text-xs text-muted-foreground">Optional</span>
                </div>
                <Input
                  id="headline"
                  placeholder="Modern ABA care for growing families"
                  {...register("headline")}
                  className="h-11 border-border/60 bg-muted/50 focus:bg-card"
                />
                {errors.headline && <p className="text-sm text-destructive">{errors.headline.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={5}
                  placeholder="Describe your approach, the families you serve, and what makes your agency special."
                  {...register("description")}
                  className="border-border/60 bg-muted/50 focus:bg-card"
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
              </div>
            </div>
          </motion.section>

          {/* Contact */}
          <motion.section
            variants={fadeUp}
            className="space-y-5 rounded-2xl border border-border/60 bg-card p-4 sm:p-6"
          >
            <div>
              <h2 className="text-lg font-semibold text-foreground">Contact info</h2>
              <p className="mt-1 text-sm text-muted-foreground">How families will reach you.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input
                  id="contactEmail"
                  placeholder="hello@youragency.com"
                  {...register("contactEmail")}
                  className="h-11 border-border/60 bg-muted/50 focus:bg-card"
                />
                {errors.contactEmail && <p className="text-sm text-destructive">{errors.contactEmail.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="contactPhone">Phone</Label>
                    <span className="text-xs text-muted-foreground">Optional</span>
                  </div>
                  <Input
                    id="contactPhone"
                    placeholder="(555) 123-4567"
                    {...register("contactPhone")}
                    className="h-11 border-border/60 bg-muted/50 focus:bg-card"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="website">Website</Label>
                    <span className="text-xs text-muted-foreground">Optional</span>
                  </div>
                  <Input
                    id="website"
                    placeholder="https://youragency.com"
                    {...register("website")}
                    className="h-11 border-border/60 bg-muted/50 focus:bg-card"
                  />
                  {errors.website && <p className="text-sm text-destructive">{errors.website.message}</p>}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Brand */}
          <motion.section
            variants={fadeUp}
            className="space-y-5 rounded-2xl border border-border/60 bg-card p-4 sm:p-6"
          >
            <div>
              <h2 className="text-lg font-semibold text-foreground">Brand identity</h2>
              <p className="mt-1 text-sm text-muted-foreground">Logo and color used across your branded pages.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-muted/50 p-4">
                <LogoUploader currentLogoUrl={logoUrl} hideHeader onLogoChange={setLogoUrl} />
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/50 p-4">
                <BrandColorPicker
                  value={brandColor}
                  onColorChange={handleBrandColorChange}
                  description="This color anchors your branded pages."
                />
              </div>
            </div>
          </motion.section>

          {/* Navigation footer */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
          >
            <p className="text-xs text-muted-foreground sm:text-sm">
              Name, description, and email are required.
            </p>

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full shrink-0 rounded-full bg-primary px-7 font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 sm:ml-auto sm:w-auto"
              disabled={isPending}
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

          {/* Mobile branded preview — below continue button */}
          <motion.div variants={fadeUp} className="min-w-0 xl:hidden">
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
              <div className="border-b border-border/60 bg-muted/50 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
                </div>
              </div>

              <div className="p-3 sm:p-4">
                <div
                  className="overflow-hidden rounded-xl p-2.5 sm:p-3"
                  style={{
                    backgroundColor: brandColor,
                    backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
                  }}
                >
                  <div className="rounded-lg bg-white p-3 shadow-xs sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/50 sm:h-12 sm:w-12">
                        {logoUrl ? (
                          <Image
                            src={logoUrl}
                            alt="Agency logo"
                            width={48}
                            height={48}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground sm:text-sm">
                            {(agencyName || "BW").slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
                          {agencyName || "Your agency name"}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {headline || "Your tagline goes here"}
                        </p>
                      </div>
                    </div>

                    <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {description || "Your agency description will appear here."}
                    </p>

                    <div className="mt-2.5 space-y-1">
                      {[
                        { icon: Mail, value: contactEmail || "Email" },
                        { icon: Phone, value: contactPhone || "Phone" },
                        { icon: Globe, value: website || "Website" },
                      ].map(({ icon: Icon, value }) => (
                        <div
                          key={value}
                          className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-1 text-xs text-muted-foreground"
                        >
                          <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {["Listing", "Agency page", "Contact page", "Dashboard"].map(
                    (label) => (
                      <span
                        key={label}
                        className="rounded-md bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground"
                      >
                        {label}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </form>

        {/* Live preview sidebar — hidden on mobile */}
        <motion.aside
          variants={fadeUp}
          className="hidden xl:sticky xl:top-24 xl:block xl:self-start"
        >
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
            <div className="border-b border-border/60 bg-muted/50 px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
              </div>
            </div>

            <div className="p-4">
              {/* Branded preview card */}
              <div
                className="overflow-hidden rounded-xl p-3"
                style={{
                  backgroundColor: brandColor,
                  backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
                }}
              >
                <div className="rounded-lg bg-white p-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/50">
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt="Agency logo"
                          width={48}
                          height={48}
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">
                          {(agencyName || "BW").slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-foreground">
                        {agencyName || "Your agency name"}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {headline || "Your tagline goes here"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {description || "Your agency description will appear here."}
                  </p>

                  <div className="mt-3 space-y-1.5">
                    {[
                      { icon: Mail, value: contactEmail || "Email" },
                      { icon: Phone, value: contactPhone || "Phone" },
                      { icon: Globe, value: website || "Website" },
                    ].map(({ icon: Icon, value }) => (
                      <div
                        key={value}
                        className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground"
                      >
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Used across badges */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["Listing", "Agency page", "Contact page", "Dashboard"].map(
                  (label) => (
                    <span
                      key={label}
                      className="rounded-md bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground"
                    >
                      {label}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </motion.div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { SERVICE_TYPES } from "@/lib/constants/listings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { updateProfileBasics, updateListingDetails, updateBasicAttributes } from "@/lib/actions/onboarding";

const onboardingSchema = z.object({
  companyName: z.string().min(2),
  tagline: z.string().max(120).optional(),
  description: z.string().min(40),
  email: z.string().email(),
  phone: z.string().min(10),
  website: z.string().url().optional(),
  services: z.array(z.string().min(1)).min(1),
  insurances: z.string().optional(),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

const premiumFields = [
  { label: "Photo gallery", description: "Upload up to 6 images to showcase your team and facilities." },
  { label: "Video spotlight", description: "Embed a YouTube or Vimeo tour for families." },
  { label: "Enhanced design", description: "Custom background and badges in search results." },
];

export function ListingOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: "",
      tagline: "",
      description: "",
      email: "",
      phone: "",
      website: "",
      services: [],
      insurances: "",
    },
  });

  const steps = [
    {
      title: "Company basics",
      description: "Tell families who you are and how you serve them.",
      fields: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              placeholder="Thrive Spectrum ABA"
              {...form.register("companyName")}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              placeholder="Family-first ABA for every setting"
              {...form.register("tagline")}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              rows={5}
              placeholder="Share your approach, specialties, and what makes your agency unique."
            />
          </div>
        </div>
      ),
    },
    {
      title: "Contact & coverage",
      description: "Make it easy for families to reach you.",
      fields: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="hello@thrivespectrumaba.com"
              {...form.register("email")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="(480) 555-1182"
              {...form.register("phone")}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              placeholder="https://thrivespectrumaba.com"
              {...form.register("website")}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="insurances">Accepted insurances</Label>
            <Textarea
              id="insurances"
              {...form.register("insurances")}
              rows={3}
              placeholder="BCBS, Aetna, Medicaid (DDD), TRICARE..."
            />
          </div>
        </div>
      ),
    },
    {
      title: "Service offerings",
      description: "Select the service modalities and settings you provide.",
      fields: (
        <div className="space-y-3">
          {SERVICE_TYPES.map((service) => (
            <label
              key={service.value}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <span>{service.label}</span>
              <input
                type="checkbox"
                value={service.value}
                className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                {...form.register("services")}
              />
            </label>
          ))}
        </div>
      ),
    },
  ];

  const nextStep = () => setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((step) => Math.max(step - 1, 0));

  const onSubmit = (values: OnboardingValues) => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        // Step 1: Update profile basics
        const profileResult = await updateProfileBasics({
          agencyName: values.companyName,
          contactEmail: values.email,
          contactPhone: values.phone,
          website: values.website || undefined,
        });

        if (!profileResult.success) {
          setError(profileResult.error);
          return;
        }

        // Step 2: Update listing details
        // Map service values to expected types
        const serviceModesMap: Record<string, "in_home" | "in_center" | "telehealth" | "hybrid"> = {
          in_home: "in_home",
          in_center: "in_center",
          both: "hybrid",
        };
        const mappedServiceModes = values.services
          .map((s) => serviceModesMap[s])
          .filter((s): s is "in_home" | "in_center" | "telehealth" | "hybrid" => !!s);

        const listingResult = await updateListingDetails({
          headline: values.tagline || values.companyName,
          description: values.description,
          serviceModes: mappedServiceModes,
        });

        if (!listingResult.success) {
          setError(listingResult.error);
          return;
        }

        // Step 3: Update insurances if provided
        if (values.insurances) {
          const insurancesList = values.insurances
            .split(",")
            .map((i) => i.trim())
            .filter(Boolean);

          if (insurancesList.length > 0) {
            const attrResult = await updateBasicAttributes({
              insurances: insurancesList,
            });

            if (!attrResult.success) {
              setError(attrResult.error);
              return;
            }
          }
        }

        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      }
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Listing onboarding</CardTitle>
        <CardDescription>
          Complete each step to publish your listing. Additional enhancements unlock with Premium.
        </CardDescription>
        {error && (
          <div className="mt-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-2 rounded-md bg-green-500/10 p-3 text-sm text-green-600">
            Listing saved successfully!
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={`step-${currentStep}`} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            {steps.map((step, index) => (
              <TabsTrigger key={step.title} value={`step-${index}`} className="text-xs uppercase">
                {step.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {steps.map((step, index) => (
            <TabsContent
              key={step.title}
              value={`step-${index}`}
              className="mt-6 focus-visible:outline-none"
            >
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>{step.description}</p>
                <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                  {step.fields}
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={currentStep === 0}
                      onClick={prevStep}
                    >
                      Previous
                    </Button>
                    {index < steps.length - 1 ? (
                      <Button type="button" onClick={nextStep}>
                        Save & continue
                      </Button>
                    ) : (
                      <Button type="submit" disabled={isPending}>
                        {isPending ? "Saving..." : "Publish listing"}
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Premium upgrades unlock</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {premiumFields.map((field) => (
              <div key={field.label} className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-medium text-foreground">{field.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

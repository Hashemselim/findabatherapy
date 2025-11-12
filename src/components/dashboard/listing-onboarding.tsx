"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { SERVICE_TYPES } from "@/lib/constants/listings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-200">Company name</label>
            <Input
              placeholder="Thrive Spectrum ABA"
              {...form.register("companyName")}
              className="mt-1 border-white/10 bg-white/5 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-200">Tagline</label>
            <Input
              placeholder="Family-first ABA for every setting"
              {...form.register("tagline")}
              className="mt-1 border-white/10 bg-white/5 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-200">Description</label>
            <textarea
              {...form.register("description")}
              rows={5}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white shadow-inner outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
          <div>
            <label className="text-sm font-medium text-slate-200">Email</label>
            <Input
              type="email"
              placeholder="hello@thrivespectrumaba.com"
              {...form.register("email")}
              className="mt-1 border-white/10 bg-white/5 text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-200">Phone</label>
            <Input
              placeholder="(480) 555-1182"
              {...form.register("phone")}
              className="mt-1 border-white/10 bg-white/5 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-200">Website</label>
            <Input
              placeholder="https://thrivespectrumaba.com"
              {...form.register("website")}
              className="mt-1 border-white/10 bg-white/5 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-200">Accepted insurances</label>
            <textarea
              {...form.register("insurances")}
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white shadow-inner outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
            >
              <span>{service.label}</span>
              <input
                type="checkbox"
                value={service.value}
                className="h-4 w-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary"
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
    // TODO: Persist listing updates to Supabase via server action or RPC.
    void values;
  };

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-white">Listing onboarding</CardTitle>
        <CardDescription className="text-slate-300">
          Complete each step to publish your listing. Additional enhancements unlock with Premium.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={`step-${currentStep}`} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/10">
            {steps.map((step, index) => (
              <TabsTrigger key={step.title} value={`step-${index}`} className="text-xs uppercase text-slate-200">
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
              <div className="space-y-4 text-sm text-slate-300">
                <p>{step.description}</p>
                <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                  {step.fields}
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={currentStep === 0}
                      onClick={prevStep}
                      className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    >
                      Previous
                    </Button>
                    {index < steps.length - 1 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Save & continue
                      </Button>
                    ) : (
                      <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Publish listing
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <Separator className="bg-white/10" />

        <div>
          <h3 className="text-sm font-semibold uppercase text-slate-200">Premium upgrades unlock</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {premiumFields.map((field) => (
              <div key={field.label} className="rounded-xl border border-primary/40 bg-primary/[0.08] p-4">
                <p className="text-sm font-medium text-white">{field.label}</p>
                <p className="mt-1 text-xs text-primary-foreground/80">{field.description}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect, useTransition } from "react";
import { Loader2, CheckCircle2, Settings2, Sparkles, Search, Users, Globe, Stethoscope } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LANGUAGE_OPTIONS,
  DIAGNOSIS_OPTIONS,
  SPECIALTY_OPTIONS,
} from "@/lib/validations/onboarding";
import { getListingAttributes, updateListingAttributes } from "@/lib/actions/listings";

interface ServicesAttributesCardProps {
  planTier: string;
}

interface AttributeData {
  languages: string[];
  diagnoses: string[];
  clinicalSpecialties: string[];
  agesServedMin: number;
  agesServedMax: number;
}

export function ServicesAttributesCard({ planTier }: ServicesAttributesCardProps) {
  const [data, setData] = useState<AttributeData>({
    languages: [],
    diagnoses: [],
    clinicalSpecialties: [],
    agesServedMin: 0,
    agesServedMax: 21,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isPaidPlan = planTier !== "free";

  useEffect(() => {
    async function loadData() {
      const result = await getListingAttributes();
      if (result.success && result.data) {
        const attrs = result.data;
        const agesServed = attrs.ages_served as { min: number; max: number } | undefined;
        setData({
          languages: (attrs.languages as string[]) || [],
          diagnoses: (attrs.diagnoses as string[]) || [],
          clinicalSpecialties: (attrs.clinical_specialties as string[]) || [],
          agesServedMin: agesServed?.min ?? 0,
          agesServedMax: agesServed?.max ?? 21,
        });
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  function toggleArrayItem(array: string[], item: string, field: keyof AttributeData) {
    if (!isPaidPlan) return;
    const newArray = array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
    setData((prev) => ({ ...prev, [field]: newArray }));
  }

  async function handleSave() {
    if (!isPaidPlan) return;
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateListingAttributes({
        languages: data.languages,
        diagnoses: data.diagnoses,
        clinicalSpecialties: data.clinicalSpecialties,
        agesServedMin: data.agesServedMin,
        agesServedMax: data.agesServedMax,
        isAcceptingClients: true, // Preserve existing value
      });

      if (!result.success) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Free plan: Show locked view with all available features
  if (!isPaidPlan) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/80 via-white to-slate-50 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(147,51,234,0.06),transparent_50%)]" />

        <div className="relative p-6">
          {/* Header with strong value prop */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <Settings2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900">Services & Specialties</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                  <Sparkles className="h-3 w-3" />
                  Pro
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                <span className="font-medium text-slate-800">Get found by the right families.</span> When parents search for specific needs - like &quot;Spanish-speaking ABA for toddlers&quot; - your listing shows up. Without these details, you&apos;re invisible to them.
              </p>
            </div>
          </div>

          {/* What you can showcase */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Ages Served</p>
                <p className="text-xs text-slate-500">Show families you work with their child&apos;s age group</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Languages</p>
                <p className="text-xs text-slate-500">Reach bilingual families searching in their language</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Stethoscope className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Diagnoses</p>
                <p className="text-xs text-slate-500">ASD, ADHD, developmental delays & more</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Specialties</p>
                <p className="text-xs text-slate-500">Early intervention, feeding therapy, social skills</p>
              </div>
            </div>
          </div>

          {/* Why this matters */}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Appear in filtered searches</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Attract your ideal clients</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Stand out from basic listings</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Update anytime as you grow</span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 flex items-center justify-between rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Ready to get discovered?</span>
            </p>
            <Button asChild size="sm" className="rounded-full">
              <Link href="/dashboard/billing">
                Upgrade Now
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Paid plan: Full editing capability
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Services & Specialties</CardTitle>
        <CardDescription>
          Update the services you offer and specialties to help families find you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Changes saved successfully
          </div>
        )}

        {/* Ages */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Minimum Age</Label>
            <Select
              value={data.agesServedMin.toString()}
              onValueChange={(v) => setData((prev) => ({ ...prev, agesServedMin: parseInt(v) }))}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 22 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {i} years
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Maximum Age</Label>
            <Select
              value={data.agesServedMax.toString()}
              onValueChange={(v) => setData((prev) => ({ ...prev, agesServedMax: parseInt(v) }))}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 100 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {i === 99 ? "99+ years" : `${i} years`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Languages */}
        <div className="space-y-2">
          <Label>Languages Spoken</Label>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {LANGUAGE_OPTIONS.map((lang) => (
              <label
                key={lang}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-2 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={data.languages.includes(lang)}
                  onCheckedChange={() => toggleArrayItem(data.languages, lang, "languages")}
                  disabled={isPending}
                />
                <span className="text-sm text-foreground">{lang}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Diagnoses */}
        <div className="space-y-2">
          <Label>Diagnoses Supported</Label>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
            {DIAGNOSIS_OPTIONS.map((diagnosis) => (
              <label
                key={diagnosis}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-2 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={data.diagnoses.includes(diagnosis)}
                  onCheckedChange={() => toggleArrayItem(data.diagnoses, diagnosis, "diagnoses")}
                  disabled={isPending}
                />
                <span className="text-sm text-foreground">{diagnosis}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Specialties */}
        <div className="space-y-2">
          <Label>Clinical Specialties</Label>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
            {SPECIALTY_OPTIONS.map((specialty) => (
              <label
                key={specialty}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-2 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={data.clinicalSpecialties.includes(specialty)}
                  onCheckedChange={() => toggleArrayItem(data.clinicalSpecialties, specialty, "clinicalSpecialties")}
                  disabled={isPending}
                />
                <span className="text-sm text-foreground">{specialty}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isPending} className="w-full sm:w-auto">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

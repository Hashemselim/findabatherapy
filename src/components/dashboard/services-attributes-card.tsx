"use client";

import { useState, useEffect, useTransition } from "react";
import { Loader2, CheckCircle2, Pencil, X, Save } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  planTier?: string; // No longer used for gating — kept for API compatibility
}

interface AttributeData {
  languages: string[];
  diagnoses: string[];
  clinicalSpecialties: string[];
  agesServedMin: number;
  agesServedMax: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ServicesAttributesCard({ planTier }: ServicesAttributesCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<AttributeData>({
    languages: [],
    diagnoses: [],
    clinicalSpecialties: [],
    agesServedMin: 0,
    agesServedMax: 21,
  });
  // Track saved data separately for cancel functionality
  const [savedData, setSavedData] = useState<AttributeData>({
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

  useEffect(() => {
    async function loadData() {
      const result = await getListingAttributes();
      if (result.success && result.data) {
        const attrs = result.data;
        const agesServed = attrs.ages_served as { min: number; max: number } | undefined;
        const loadedData = {
          languages: (attrs.languages as string[]) || [],
          diagnoses: (attrs.diagnoses as string[]) || [],
          clinicalSpecialties: (attrs.clinical_specialties as string[]) || [],
          agesServedMin: agesServed?.min ?? 0,
          agesServedMax: agesServed?.max ?? 21,
        };
        setData(loadedData);
        setSavedData(loadedData);
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  function toggleArrayItem(array: string[], item: string, field: keyof AttributeData) {
    const newArray = array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
    setData((prev) => ({ ...prev, [field]: newArray }));
  }

  function handleCancel() {
    setData(savedData);
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
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
        setSavedData(data);
        setSuccess(true);
        setIsEditing(false);
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

  // View Mode - Read-only display
  if (!isEditing) {
    const hasAnyData = savedData.languages.length > 0 ||
                       savedData.diagnoses.length > 0 ||
                       savedData.clinicalSpecialties.length > 0;

    return (
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Services & Specialties</CardTitle>
              <CardDescription className="mt-1">Details that help families find you in search</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="shrink-0 self-start">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Changes saved successfully
            </div>
          )}

          {/* Ages Served */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ages Served</p>
            <p className="text-foreground">
              {savedData.agesServedMin} - {savedData.agesServedMax === 99 ? "99+" : savedData.agesServedMax} years
            </p>
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Languages Spoken</p>
            {savedData.languages.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {savedData.languages.map((lang) => (
                  <Badge key={lang} variant="secondary">
                    {lang}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="italic text-muted-foreground">No languages specified</p>
            )}
          </div>

          {/* Diagnoses */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Diagnoses Supported</p>
            {savedData.diagnoses.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {savedData.diagnoses.map((diagnosis) => (
                  <Badge key={diagnosis} variant="outline">
                    {diagnosis}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="italic text-muted-foreground">No diagnoses specified</p>
            )}
          </div>

          {/* Specialties */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Clinical Specialties</p>
            {savedData.clinicalSpecialties.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {savedData.clinicalSpecialties.map((specialty) => (
                  <Badge key={specialty} variant="outline">
                    {specialty}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="italic text-muted-foreground">No specialties specified</p>
            )}
          </div>

          {!hasAnyData && (
            <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Add languages, diagnoses, and specialties to help families find you in search results.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsEditing(true)}>
                Add Details
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Edit Mode - Full editing capability
  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Edit Services & Specialties</CardTitle>
            <CardDescription className="mt-1">
              Update the services you offer and specialties to help families find you.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCancel} className="shrink-0 self-start">
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
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

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

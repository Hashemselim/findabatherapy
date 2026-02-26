"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2, Info } from "lucide-react";
import Turnstile from "react-turnstile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { submitPublicClientIntake } from "@/lib/actions/clients";
import { markIntakeTokenUsed, type PrefillData } from "@/lib/actions/intake";
import {
  type IntakeFieldsConfig,
  type IntakeFieldDef,
  getEnabledSections,
  getEnabledFields,
} from "@/lib/intake/field-registry";
import { buildIntakeSchema } from "@/lib/intake/build-intake-schema";
import { HomeAddressSection } from "@/components/intake/home-address-section";
import {
  ServiceLocationSection,
  type AgencyLocationOption,
} from "@/components/intake/service-location-section";

interface ClientIntakeFormProps {
  listingId: string;
  profileId: string;
  providerName: string;
  brandColor: string;
  fieldsConfig: IntakeFieldsConfig;
  agencyLocations: AgencyLocationOption[];
  initialReferralSource?: string;
  /** Pre-populated data from an intake token link */
  prefillData?: PrefillData;
  /** The intake token (passed to mark as used on submit) */
  intakeToken?: string;
}

export function ClientIntakeForm({
  listingId,
  profileId,
  providerName,
  brandColor,
  fieldsConfig,
  agencyLocations,
  initialReferralSource,
  prefillData,
  intakeToken,
}: ClientIntakeFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Build the Zod schema dynamically from the provider's field config
  const schema = useMemo(() => buildIntakeSchema(fieldsConfig), [fieldsConfig]);

  // Build default values for react-hook-form (with prefill when available)
  const { defaults: defaultValues, initialMultiSelect } = useMemo(() => {
    const defaults: Record<string, unknown> = { turnstileToken: "" };
    const multiSelects: Record<string, string[]> = {};
    const sections = getEnabledSections(fieldsConfig);
    for (const section of sections) {
      for (const field of getEnabledFields(section, fieldsConfig)) {
        // Check for pre-fill value first
        const prefillValue = prefillData?.fields[field.key];
        if (prefillValue !== undefined && prefillValue !== null && prefillValue !== "") {
          defaults[field.key] = prefillValue;
          // Track multi-select prefill values
          if (field.type === "multi-select" && Array.isArray(prefillValue)) {
            multiSelects[field.key] = prefillValue as string[];
          }
        } else if (field.type === "multi-select") {
          defaults[field.key] = [];
        } else if (field.type === "number") {
          defaults[field.key] = undefined;
        } else if (field.type === "address") {
          defaults[field.key] = {
            street_address: "",
            city: "",
            state: "",
            postal_code: "",
            formatted_address: "",
            place_id: "",
          };
        } else if (field.type === "service-location") {
          defaults[field.key] = {
            location_type: "",
            same_as_home: false,
            agency_location_id: "",
            street_address: "",
            city: "",
            state: "",
            postal_code: "",
            formatted_address: "",
            place_id: "",
            notes: "",
          };
        } else {
          defaults[field.key] = field.key === "referral_source" && initialReferralSource
            ? initialReferralSource
            : "";
        }
      }
    }
    return { defaults, initialMultiSelect: multiSelects };
  }, [fieldsConfig, initialReferralSource, prefillData]);

  // Track multi-select values separately (not easily handled by react-hook-form register)
  const [multiSelectValues, setMultiSelectValues] = useState<Record<string, string[]>>(initialMultiSelect);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const toggleMultiSelect = (fieldKey: string, value: string) => {
    setMultiSelectValues((prev) => {
      const current = prev[fieldKey] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      // Sync with react-hook-form
      form.setValue(fieldKey, updated, { shouldValidate: true });
      return { ...prev, [fieldKey]: updated };
    });
  };

  const onSubmit = async (values: Record<string, unknown>) => {
    setError(null);

    if (!turnstileToken) {
      setError("Please complete the security verification");
      return;
    }

    startTransition(async () => {
      const result = await submitPublicClientIntake({
        profileId,
        listingId,
        turnstileToken,
        fields: values as Record<string, unknown>,
      });

      if (result.success) {
        // Mark the token as used if this was a pre-fill submission
        if (intakeToken) {
          await markIntakeTokenUsed(intakeToken);
        }
        setIsSuccess(true);
      } else {
        setError(result.error || "Failed to submit form");
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="py-8 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
        <h3 className="mt-4 text-xl font-semibold">Thank You!</h3>
        <p className="mt-2 text-muted-foreground">
          Your intake form has been submitted successfully. {providerName} will
          review your information and be in touch shortly.
        </p>
      </div>
    );
  }

  // Get only sections that have enabled fields
  const enabledSections = getEnabledSections(fieldsConfig);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {prefillData && (
        <div
          className="flex items-start gap-3 rounded-lg border p-4 text-sm"
          style={{
            borderColor: `${brandColor}40`,
            backgroundColor: `${brandColor}08`,
          }}
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: brandColor }} />
          <p className="text-muted-foreground">
            Some information has been pre-filled by{" "}
            <span className="font-medium text-foreground">{providerName}</span>.
            Please review and complete the remaining fields.
          </p>
        </div>
      )}

      {enabledSections.map((section) => {
        const fields = getEnabledFields(section, fieldsConfig);
        if (fields.length === 0) return null;

        // Special handling: referral_source_other only shows when referral_source == "other"
        const visibleFields = fields.filter((f) => {
          if (f.key === "referral_source_other") {
            return form.watch("referral_source") === "other";
          }
          return true;
        });

        if (visibleFields.length === 0) return null;

        return (
          <div key={section.id} className="space-y-4">
            <h3 className="text-lg font-semibold">{section.title}</h3>

            {/* Render fields in a responsive grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {visibleFields.map((field) => {
                const isRequired = fieldsConfig[field.key]?.required ?? false;

                // Custom rendering for composite fields
                if (field.type === "address") {
                  return (
                    <HomeAddressSection
                      key={field.key}
                      form={form as UseFormReturn<Record<string, unknown>>}
                      required={isRequired}
                      brandColor={brandColor}
                    />
                  );
                }

                if (field.type === "service-location") {
                  return (
                    <ServiceLocationSection
                      key={field.key}
                      form={form as UseFormReturn<Record<string, unknown>>}
                      required={isRequired}
                      brandColor={brandColor}
                      agencyLocations={agencyLocations}
                    />
                  );
                }

                // Textarea and multi-select get full width
                const isFullWidth =
                  field.type === "textarea" || field.type === "multi-select";

                return (
                  <div
                    key={field.key}
                    className={cn("space-y-2", isFullWidth && "sm:col-span-2")}
                  >
                    <DynamicField
                      field={field}
                      required={isRequired}
                      brandColor={brandColor}
                      form={form}
                      multiSelectValues={multiSelectValues[field.key] || []}
                      onToggleMultiSelect={(value) =>
                        toggleMultiSelect(field.key, value)
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Turnstile */}
      <div className="flex justify-center">
        <Turnstile
          sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
          onVerify={(token) => {
            setTurnstileToken(token);
            form.setValue("turnstileToken", token);
          }}
          onExpire={() => {
            setTurnstileToken(null);
            form.setValue("turnstileToken", "");
          }}
          theme="light"
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPending || !turnstileToken}
        style={{ backgroundColor: brandColor }}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Intake Form"
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        By submitting this form, you agree to be contacted by {providerName}.
      </p>
    </form>
  );
}

// =============================================================================
// Dynamic Field Renderer
// =============================================================================

interface DynamicFieldProps {
  field: IntakeFieldDef;
  required: boolean;
  brandColor: string;
  form: ReturnType<typeof useForm>;
  multiSelectValues: string[];
  onToggleMultiSelect: (value: string) => void;
}

function DynamicField({
  field,
  required,
  brandColor,
  form,
  multiSelectValues,
  onToggleMultiSelect,
}: DynamicFieldProps) {
  const fieldError = form.formState.errors[field.key];
  const errorMessage = fieldError?.message as string | undefined;

  const requiredMark = required ? (
    <span className="text-destructive"> *</span>
  ) : null;

  switch (field.type) {
    case "multi-select": {
      // Render as toggleable chips (like diagnosis selector)
      const options = field.stringOptions || field.options?.map((o) => o.value) || [];
      return (
        <>
          <Label>
            {field.label}
            {requiredMark}
          </Label>
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
              const value = typeof opt === "string" ? opt : opt;
              const label = typeof opt === "string" ? opt : opt;
              const isSelected = multiSelectValues.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onToggleMultiSelect(value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm border transition-colors",
                    isSelected
                      ? "text-white border-transparent"
                      : "bg-background hover:bg-muted border-border",
                  )}
                  style={isSelected ? { backgroundColor: brandColor } : {}}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {errorMessage && (
            <p className="text-xs text-destructive">{errorMessage}</p>
          )}
        </>
      );
    }

    case "select": {
      const options = field.options || [];
      return (
        <>
          <Label>
            {field.label}
            {requiredMark}
          </Label>
          <Select
            value={form.watch(field.key) as string || ""}
            onValueChange={(value) =>
              form.setValue(field.key, value, { shouldValidate: true })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errorMessage && (
            <p className="text-xs text-destructive">{errorMessage}</p>
          )}
        </>
      );
    }

    case "textarea":
      return (
        <>
          <Label htmlFor={field.key}>
            {field.label}
            {requiredMark}
          </Label>
          <Textarea
            id={field.key}
            {...form.register(field.key)}
            placeholder={field.placeholder}
            rows={3}
          />
          {errorMessage && (
            <p className="text-xs text-destructive">{errorMessage}</p>
          )}
        </>
      );

    case "date":
      return (
        <>
          <Label htmlFor={field.key}>
            {field.label}
            {requiredMark}
          </Label>
          <Input
            id={field.key}
            type="date"
            {...form.register(field.key)}
          />
          {errorMessage && (
            <p className="text-xs text-destructive">{errorMessage}</p>
          )}
        </>
      );

    case "email":
      return (
        <>
          <Label htmlFor={field.key}>
            {field.label}
            {requiredMark}
          </Label>
          <Input
            id={field.key}
            type="email"
            {...form.register(field.key)}
            placeholder={field.placeholder || "email@example.com"}
          />
          {errorMessage && (
            <p className="text-xs text-destructive">{errorMessage}</p>
          )}
        </>
      );

    case "phone":
      return (
        <>
          <Label htmlFor={field.key}>
            {field.label}
            {requiredMark}
          </Label>
          <Input
            id={field.key}
            type="tel"
            {...form.register(field.key)}
            placeholder={field.placeholder || "(555) 555-5555"}
          />
          {errorMessage && (
            <p className="text-xs text-destructive">{errorMessage}</p>
          )}
        </>
      );

    case "number":
      return (
        <>
          <Label htmlFor={field.key}>
            {field.label}
            {requiredMark}
          </Label>
          <Input
            id={field.key}
            type="number"
            step="0.01"
            min="0"
            {...form.register(field.key, { valueAsNumber: true })}
            placeholder={field.placeholder}
          />
          {errorMessage && (
            <p className="text-xs text-destructive">{errorMessage}</p>
          )}
        </>
      );

    // "text" and fallback
    default:
      return (
        <>
          <Label htmlFor={field.key}>
            {field.label}
            {requiredMark}
          </Label>
          <Input
            id={field.key}
            {...form.register(field.key)}
            placeholder={field.placeholder}
          />
          {errorMessage && (
            <p className="text-xs text-destructive">{errorMessage}</p>
          )}
        </>
      );
  }
}

"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2 } from "lucide-react";
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
import { DIAGNOSIS_OPTIONS, INSURANCE_OPTIONS } from "@/lib/validations/onboarding";
import { PARENT_RELATIONSHIP_OPTIONS, PUBLIC_REFERRAL_SOURCE_OPTIONS } from "@/lib/validations/clients";

const clientIntakeSchema = z.object({
  // Parent info
  parent_first_name: z.string().min(1, "First name is required"),
  parent_last_name: z.string().min(1, "Last name is required"),
  parent_phone: z.string().min(1, "Phone number is required"),
  parent_email: z.string().email("Valid email is required"),
  parent_relationship: z.string().optional(),
  // Child info
  child_first_name: z.string().min(1, "Child's first name is required"),
  child_last_name: z.string().optional(),
  child_date_of_birth: z.string().optional(),
  child_diagnosis: z.array(z.string()).optional(),
  child_primary_concerns: z.string().optional(),
  // Insurance
  insurance_name: z.string().optional(),
  insurance_member_id: z.string().optional(),
  // Location
  preferred_city: z.string().optional(),
  preferred_state: z.string().optional(),
  // Referral
  referral_source: z.string().optional(),
  referral_source_other: z.string().optional(),
  // Notes
  notes: z.string().optional(),
});

type ClientIntakeFormValues = z.infer<typeof clientIntakeSchema>;

interface ClientIntakeFormProps {
  listingId: string;
  profileId: string;
  providerName: string;
  brandColor: string;
  initialReferralSource?: string;
}

export function ClientIntakeForm({
  listingId,
  profileId,
  providerName,
  brandColor,
  initialReferralSource,
}: ClientIntakeFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);

  const form = useForm<ClientIntakeFormValues>({
    resolver: zodResolver(clientIntakeSchema),
    defaultValues: {
      parent_first_name: "",
      parent_last_name: "",
      parent_phone: "",
      parent_email: "",
      child_first_name: "",
      child_diagnosis: [],
      referral_source: initialReferralSource || "",
    },
  });

  const toggleDiagnosis = (diagnosis: string) => {
    setSelectedDiagnoses((prev) =>
      prev.includes(diagnosis)
        ? prev.filter((d) => d !== diagnosis)
        : [...prev, diagnosis]
    );
  };

  const onSubmit = async (data: ClientIntakeFormValues) => {
    setError(null);

    if (!turnstileToken) {
      setError("Please complete the security verification");
      return;
    }

    startTransition(async () => {
      const result = await submitPublicClientIntake({
        profileId,
        listingId,
        parent_first_name: data.parent_first_name,
        parent_last_name: data.parent_last_name,
        parent_phone: data.parent_phone,
        parent_email: data.parent_email,
        parent_relationship: data.parent_relationship,
        child_first_name: data.child_first_name,
        child_last_name: data.child_last_name,
        child_date_of_birth: data.child_date_of_birth,
        child_diagnosis: selectedDiagnoses,
        child_primary_concerns: data.child_primary_concerns,
        insurance_name: data.insurance_name,
        insurance_member_id: data.insurance_member_id,
        preferred_city: data.preferred_city,
        preferred_state: data.preferred_state,
        referral_source: data.referral_source,
        referral_source_other: data.referral_source === "other" ? data.referral_source_other : undefined,
        notes: data.notes,
        turnstileToken,
      });

      if (result.success) {
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Parent/Guardian Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Parent/Guardian Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="parent_first_name">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="parent_first_name"
              {...form.register("parent_first_name")}
              placeholder="First name"
            />
            {form.formState.errors.parent_first_name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.parent_first_name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="parent_last_name">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="parent_last_name"
              {...form.register("parent_last_name")}
              placeholder="Last name"
            />
            {form.formState.errors.parent_last_name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.parent_last_name.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="parent_phone">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="parent_phone"
              {...form.register("parent_phone")}
              placeholder="(555) 555-5555"
            />
            {form.formState.errors.parent_phone && (
              <p className="text-xs text-destructive">
                {form.formState.errors.parent_phone.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="parent_email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="parent_email"
              type="email"
              {...form.register("parent_email")}
              placeholder="email@example.com"
            />
            {form.formState.errors.parent_email && (
              <p className="text-xs text-destructive">
                {form.formState.errors.parent_email.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Relationship to Child</Label>
          <Select
            value={form.watch("parent_relationship") || ""}
            onValueChange={(value) => form.setValue("parent_relationship", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select relationship" />
            </SelectTrigger>
            <SelectContent>
              {PARENT_RELATIONSHIP_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Child Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Child Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="child_first_name">
              Child&apos;s First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="child_first_name"
              {...form.register("child_first_name")}
              placeholder="First name"
            />
            {form.formState.errors.child_first_name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.child_first_name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="child_last_name">Child&apos;s Last Name</Label>
            <Input
              id="child_last_name"
              {...form.register("child_last_name")}
              placeholder="Last name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="child_date_of_birth">Child&apos;s Date of Birth</Label>
          <Input
            id="child_date_of_birth"
            type="date"
            {...form.register("child_date_of_birth")}
          />
        </div>

        <div className="space-y-2">
          <Label>Diagnosis</Label>
          <div className="flex flex-wrap gap-2">
            {DIAGNOSIS_OPTIONS.map((diagnosis) => (
              <button
                key={diagnosis}
                type="button"
                onClick={() => toggleDiagnosis(diagnosis)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm border transition-colors",
                  selectedDiagnoses.includes(diagnosis)
                    ? "text-white border-transparent"
                    : "bg-background hover:bg-muted border-border"
                )}
                style={
                  selectedDiagnoses.includes(diagnosis)
                    ? { backgroundColor: brandColor }
                    : {}
                }
              >
                {diagnosis}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="child_primary_concerns">Primary Concerns</Label>
          <Textarea
            id="child_primary_concerns"
            {...form.register("child_primary_concerns")}
            placeholder="Please describe any concerns or areas you'd like addressed..."
            rows={3}
          />
        </div>
      </div>

      {/* Insurance Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Insurance Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Insurance Provider</Label>
            <Select
              value={form.watch("insurance_name") || ""}
              onValueChange={(value) => form.setValue("insurance_name", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select insurance" />
              </SelectTrigger>
              <SelectContent>
                {INSURANCE_OPTIONS.map((insurance) => (
                  <SelectItem key={insurance} value={insurance}>
                    {insurance}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="insurance_member_id">Member ID</Label>
            <Input
              id="insurance_member_id"
              {...form.register("insurance_member_id")}
              placeholder="Member ID"
            />
          </div>
        </div>
      </div>

      {/* Preferred Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Preferred Location</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="preferred_city">City</Label>
            <Input
              id="preferred_city"
              {...form.register("preferred_city")}
              placeholder="City"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_state">State</Label>
            <Input
              id="preferred_state"
              {...form.register("preferred_state")}
              placeholder="State"
              maxLength={2}
            />
          </div>
        </div>
      </div>

      {/* Referral Source */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>
            How did you hear about us?{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Select
            value={form.watch("referral_source") || ""}
            onValueChange={(value) => form.setValue("referral_source", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {PUBLIC_REFERRAL_SOURCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {form.watch("referral_source") === "other" && (
          <div className="space-y-2">
            <Label htmlFor="referral_source_other">Please specify</Label>
            <Input
              id="referral_source_other"
              {...form.register("referral_source_other")}
              placeholder="How did you find us?"
            />
          </div>
        )}
      </div>

      {/* Additional Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder="Any additional information you'd like to share..."
          rows={3}
        />
      </div>

      {/* Turnstile */}
      <div className="flex justify-center">
        <Turnstile
          sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken(null)}
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

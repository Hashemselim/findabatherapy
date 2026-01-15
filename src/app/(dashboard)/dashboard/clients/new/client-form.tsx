"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  MapPin,
  Shield,
  FileText,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import type { PlaceDetails } from "@/hooks/use-places-autocomplete";
import { cn } from "@/lib/utils";
import {
  createClient,
  updateClient,
  addClientParent,
  updateClientParent,
  addClientLocation,
  updateClientLocation,
  addClientInsurance,
  updateClientInsurance,
} from "@/lib/actions/clients";
import {
  CLIENT_STATUS_OPTIONS,
  CLIENT_FUNDING_SOURCE_OPTIONS,
  PARENT_RELATIONSHIP_OPTIONS,
  INSURANCE_TYPE_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  GRADE_LEVEL_OPTIONS,
  LOCATION_LABEL_OPTIONS,
  type ClientStatus,
  type FundingSource,
  type ParentRelationship,
  type InsuranceType,
} from "@/lib/validations/clients";
import { INSURANCE_OPTIONS, LANGUAGE_OPTIONS, DIAGNOSIS_OPTIONS } from "@/lib/validations/onboarding";

// Form schema - all fields optional for flexible data entry
const clientFormSchema = z.object({
  // Status
  status: z.string().optional(),
  referral_source: z.string().optional(),
  funding_source: z.string().optional(),
  preferred_language: z.string().optional(),

  // Child info
  child_first_name: z.string().optional(),
  child_last_name: z.string().optional(),
  child_date_of_birth: z.string().optional(),
  child_diagnosis: z.array(z.string()).optional(),
  child_primary_concerns: z.string().optional(),
  child_aba_history: z.string().optional(),
  child_school_name: z.string().optional(),
  child_school_district: z.string().optional(),
  child_grade_level: z.string().optional(),
  child_other_therapies: z.string().optional(),
  child_pediatrician_name: z.string().optional(),
  child_pediatrician_phone: z.string().optional(),

  // Notes
  notes: z.string().optional(),

  // Related entities (will be created/updated separately)
  parents: z.array(z.object({
    id: z.string().optional(), // For existing records
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    notes: z.string().optional(),
    is_primary: z.boolean().optional(),
  })).optional(),

  locations: z.array(z.object({
    id: z.string().optional(), // For existing records
    label: z.string().optional(),
    street_address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    place_id: z.string().optional(),
    notes: z.string().optional(),
    is_primary: z.boolean().optional(),
  })).optional(),

  insurances: z.array(z.object({
    id: z.string().optional(), // For existing records
    insurance_name: z.string().optional(),
    insurance_type: z.string().optional(),
    member_id: z.string().optional(),
    group_number: z.string().optional(),
    is_primary: z.boolean().optional(),
  })).optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  defaultValues?: Partial<ClientFormValues>;
  inquiryId?: string;
  clientId?: string; // For edit mode
  isEditMode?: boolean;
}

export function ClientForm({ defaultValues, inquiryId, clientId, isEditMode = false }: ClientFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    status: true,
    child: true,
    parents: true,
    locations: false,
    insurance: false,
    notes: false,
  });

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      status: "inquiry",
      child_diagnosis: [],
      parents: [{ is_primary: true }],
      locations: [],
      insurances: [],
      ...defaultValues,
    },
  });

  const {
    fields: parentFields,
    append: appendParent,
    remove: removeParent,
  } = useFieldArray({
    control: form.control,
    name: "parents",
  });

  const {
    fields: locationFields,
    append: appendLocation,
    remove: removeLocation,
  } = useFieldArray({
    control: form.control,
    name: "locations",
  });

  const {
    fields: insuranceFields,
    append: appendInsurance,
    remove: removeInsurance,
  } = useFieldArray({
    control: form.control,
    name: "insurances",
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleDiagnosis = (diagnosis: string) => {
    const current = form.getValues("child_diagnosis") || [];
    if (current.includes(diagnosis)) {
      form.setValue("child_diagnosis", current.filter((d) => d !== diagnosis));
    } else {
      form.setValue("child_diagnosis", [...current, diagnosis]);
    }
  };

  const handlePlaceSelect = (index: number, place: PlaceDetails) => {
    form.setValue(`locations.${index}.street_address`, place.formattedAddress || "");
    form.setValue(`locations.${index}.city`, place.city || "");
    form.setValue(`locations.${index}.state`, place.state || "");
    form.setValue(`locations.${index}.postal_code`, place.postalCode || "");
    form.setValue(`locations.${index}.latitude`, place.latitude);
    form.setValue(`locations.${index}.longitude`, place.longitude);
    form.setValue(`locations.${index}.place_id`, place.placeId);
  };

  const onSubmit = async (data: ClientFormValues) => {
    setError(null);

    startTransition(async () => {
      try {
        let targetClientId = clientId;

        if (isEditMode && clientId) {
          // UPDATE MODE: Update existing client
          const updateResult = await updateClient(clientId, {
            status: data.status as ClientStatus,
            referral_source: data.referral_source,
            funding_source: data.funding_source as FundingSource | undefined,
            preferred_language: data.preferred_language,
            child_first_name: data.child_first_name,
            child_last_name: data.child_last_name,
            child_date_of_birth: data.child_date_of_birth,
            child_diagnosis: data.child_diagnosis,
            child_primary_concerns: data.child_primary_concerns,
            child_aba_history: data.child_aba_history,
            child_school_name: data.child_school_name,
            child_school_district: data.child_school_district,
            child_grade_level: data.child_grade_level,
            child_other_therapies: data.child_other_therapies,
            child_pediatrician_name: data.child_pediatrician_name,
            child_pediatrician_phone: data.child_pediatrician_phone,
            notes: data.notes,
          });

          if (!updateResult.success) {
            setError(updateResult.error || "Failed to update client");
            return;
          }

          // Update or add parents
          for (const parent of data.parents || []) {
            if (parent.first_name || parent.last_name || parent.phone || parent.email) {
              if (parent.id) {
                // Update existing parent
                await updateClientParent(parent.id, {
                  first_name: parent.first_name,
                  last_name: parent.last_name,
                  relationship: parent.relationship as ParentRelationship | undefined,
                  phone: parent.phone,
                  email: parent.email,
                  notes: parent.notes,
                  is_primary: parent.is_primary,
                });
              } else {
                // Add new parent
                await addClientParent(clientId, {
                  first_name: parent.first_name,
                  last_name: parent.last_name,
                  relationship: parent.relationship as ParentRelationship | undefined,
                  phone: parent.phone,
                  email: parent.email,
                  notes: parent.notes,
                  is_primary: parent.is_primary,
                });
              }
            }
          }

          // Update or add locations
          for (const location of data.locations || []) {
            if (location.street_address || location.city) {
              if (location.id) {
                await updateClientLocation(location.id, {
                  label: location.label,
                  street_address: location.street_address,
                  city: location.city,
                  state: location.state,
                  postal_code: location.postal_code,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  place_id: location.place_id,
                  notes: location.notes,
                  is_primary: location.is_primary,
                });
              } else {
                await addClientLocation(clientId, {
                  label: location.label,
                  street_address: location.street_address,
                  city: location.city,
                  state: location.state,
                  postal_code: location.postal_code,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  place_id: location.place_id,
                  notes: location.notes,
                  is_primary: location.is_primary,
                });
              }
            }
          }

          // Update or add insurances
          for (const insurance of data.insurances || []) {
            if (insurance.insurance_name || insurance.member_id) {
              if (insurance.id) {
                await updateClientInsurance(insurance.id, {
                  insurance_name: insurance.insurance_name,
                  insurance_type: insurance.insurance_type as InsuranceType | undefined,
                  member_id: insurance.member_id,
                  group_number: insurance.group_number,
                  is_primary: insurance.is_primary,
                });
              } else {
                await addClientInsurance(clientId, {
                  insurance_name: insurance.insurance_name,
                  insurance_type: insurance.insurance_type as InsuranceType | undefined,
                  member_id: insurance.member_id,
                  group_number: insurance.group_number,
                  is_primary: insurance.is_primary,
                });
              }
            }
          }
        } else {
          // CREATE MODE: Create new client
          const clientResult = await createClient({
            status: data.status as ClientStatus,
            referral_source: data.referral_source,
            funding_source: data.funding_source as FundingSource | undefined,
            preferred_language: data.preferred_language,
            child_first_name: data.child_first_name,
            child_last_name: data.child_last_name,
            child_date_of_birth: data.child_date_of_birth,
            child_diagnosis: data.child_diagnosis,
            child_primary_concerns: data.child_primary_concerns,
            child_aba_history: data.child_aba_history,
            child_school_name: data.child_school_name,
            child_school_district: data.child_school_district,
            child_grade_level: data.child_grade_level,
            child_other_therapies: data.child_other_therapies,
            child_pediatrician_name: data.child_pediatrician_name,
            child_pediatrician_phone: data.child_pediatrician_phone,
            notes: data.notes,
            inquiry_id: inquiryId,
          });

          if (!clientResult.success) {
            setError(clientResult.error || "Failed to create client");
            return;
          }

          if (!clientResult.data) {
            setError("Failed to create client");
            return;
          }

          targetClientId = clientResult.data.id;

          // Add parents
          for (const parent of data.parents || []) {
            if (parent.first_name || parent.last_name || parent.phone || parent.email) {
              await addClientParent(targetClientId, {
                first_name: parent.first_name,
                last_name: parent.last_name,
                relationship: parent.relationship as ParentRelationship | undefined,
                phone: parent.phone,
                email: parent.email,
                notes: parent.notes,
                is_primary: parent.is_primary,
              });
            }
          }

          // Add locations
          for (const location of data.locations || []) {
            if (location.street_address || location.city) {
              await addClientLocation(targetClientId, {
                label: location.label,
                street_address: location.street_address,
                city: location.city,
                state: location.state,
                postal_code: location.postal_code,
                latitude: location.latitude,
                longitude: location.longitude,
                place_id: location.place_id,
                notes: location.notes,
                is_primary: location.is_primary,
              });
            }
          }

          // Add insurances
          for (const insurance of data.insurances || []) {
            if (insurance.insurance_name || insurance.member_id) {
              await addClientInsurance(targetClientId, {
                insurance_name: insurance.insurance_name,
                insurance_type: insurance.insurance_type as InsuranceType | undefined,
                member_id: insurance.member_id,
                group_number: insurance.group_number,
                is_primary: insurance.is_primary,
              });
            }
          }
        }

        // Redirect to client detail page
        router.push(`/dashboard/clients/${targetClientId}`);
      } catch (err) {
        console.error("Failed to save client:", err);
        setError("An unexpected error occurred");
      }
    });
  };

  const selectedDiagnoses = form.watch("child_diagnosis") || [];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-24">
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Status Section */}
      <Collapsible open={openSections.status} onOpenChange={() => toggleSection("status")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Client Status
                </CardTitle>
                {openSections.status ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) => form.setValue("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Referral Source</Label>
                <Select
                  value={form.watch("referral_source") || ""}
                  onValueChange={(value) => form.setValue("referral_source", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERRAL_SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Funding Source</Label>
                <Select
                  value={form.watch("funding_source") || ""}
                  onValueChange={(value) => form.setValue("funding_source", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select funding" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_FUNDING_SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preferred Language</Label>
                <Select
                  value={form.watch("preferred_language") || ""}
                  onValueChange={(value) => form.setValue("preferred_language", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Child Information Section */}
      <Collapsible open={openSections.child} onOpenChange={() => toggleSection("child")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Child Information
                </CardTitle>
                {openSections.child ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Name & DOB */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input {...form.register("child_first_name")} placeholder="First name" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input {...form.register("child_last_name")} placeholder="Last name" />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" {...form.register("child_date_of_birth")} />
                </div>
              </div>

              {/* Diagnosis */}
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
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border"
                      )}
                    >
                      {diagnosis}
                    </button>
                  ))}
                </div>
              </div>

              {/* School Info */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>School Name</Label>
                  <Input {...form.register("child_school_name")} placeholder="School name" />
                </div>
                <div className="space-y-2">
                  <Label>School District</Label>
                  <Input {...form.register("child_school_district")} placeholder="School district" />
                </div>
                <div className="space-y-2">
                  <Label>Grade Level</Label>
                  <Select
                    value={form.watch("child_grade_level") || ""}
                    onValueChange={(value) => form.setValue("child_grade_level", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pediatrician */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Pediatrician Name</Label>
                  <Input {...form.register("child_pediatrician_name")} placeholder="Dr. Name" />
                </div>
                <div className="space-y-2">
                  <Label>Pediatrician Phone</Label>
                  <Input {...form.register("child_pediatrician_phone")} placeholder="(555) 555-5555" />
                </div>
              </div>

              {/* Text areas */}
              <div className="space-y-2">
                <Label>Primary Concerns</Label>
                <Textarea
                  {...form.register("child_primary_concerns")}
                  placeholder="Describe primary concerns..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>ABA History</Label>
                <Textarea
                  {...form.register("child_aba_history")}
                  placeholder="Previous ABA therapy experience..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Other Therapies</Label>
                <Textarea
                  {...form.register("child_other_therapies")}
                  placeholder="Speech therapy, OT, etc..."
                  rows={2}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Parents Section */}
      <Collapsible open={openSections.parents} onOpenChange={() => toggleSection("parents")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Parents/Guardians ({parentFields.length})
                </CardTitle>
                {openSections.parents ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {parentFields.map((field, index) => (
                <div key={field.id} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Parent {index + 1}</span>
                      {index === 0 && (
                        <span className="text-xs text-muted-foreground">(Primary)</span>
                      )}
                    </div>
                    {parentFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParent(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input {...form.register(`parents.${index}.first_name`)} placeholder="First name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input {...form.register(`parents.${index}.last_name`)} placeholder="Last name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Select
                        value={form.watch(`parents.${index}.relationship`) || ""}
                        onValueChange={(value) => form.setValue(`parents.${index}.relationship`, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input {...form.register(`parents.${index}.phone`)} placeholder="(555) 555-5555" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input {...form.register(`parents.${index}.email`)} placeholder="email@example.com" type="email" />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => appendParent({ is_primary: false })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Parent
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Locations Section */}
      <Collapsible open={openSections.locations} onOpenChange={() => toggleSection("locations")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Therapy Locations ({locationFields.length})
                </CardTitle>
                {openSections.locations ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {locationFields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No locations added yet
                </p>
              ) : (
                locationFields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Location {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLocation(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Select
                          value={form.watch(`locations.${index}.label`) || ""}
                          onValueChange={(value) => form.setValue(`locations.${index}.label`, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {LOCATION_LABEL_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <PlacesAutocomplete
                          value={form.watch(`locations.${index}.street_address`) || ""}
                          onChange={(value) => form.setValue(`locations.${index}.street_address`, value)}
                          onPlaceSelect={(place) => handlePlaceSelect(index, place)}
                          placeholder="Start typing an address..."
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-4">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>City</Label>
                        <Input {...form.register(`locations.${index}.city`)} placeholder="City" />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input {...form.register(`locations.${index}.state`)} placeholder="State" maxLength={2} />
                      </div>
                      <div className="space-y-2">
                        <Label>ZIP</Label>
                        <Input {...form.register(`locations.${index}.postal_code`)} placeholder="ZIP" />
                      </div>
                    </div>
                  </div>
                ))
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => appendLocation({ is_primary: locationFields.length === 0 })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Insurance Section */}
      <Collapsible open={openSections.insurance} onOpenChange={() => toggleSection("insurance")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Insurance ({insuranceFields.length})
                </CardTitle>
                {openSections.insurance ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {insuranceFields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No insurance added yet
                </p>
              ) : (
                insuranceFields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Insurance {index + 1}</span>
                        {index === 0 && (
                          <span className="text-xs text-muted-foreground">(Primary)</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInsurance(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Insurance Provider</Label>
                        <Select
                          value={form.watch(`insurances.${index}.insurance_name`) || ""}
                          onValueChange={(value) => form.setValue(`insurances.${index}.insurance_name`, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
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
                        <Label>Insurance Type</Label>
                        <Select
                          value={form.watch(`insurances.${index}.insurance_type`) || ""}
                          onValueChange={(value) => form.setValue(`insurances.${index}.insurance_type`, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {INSURANCE_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Member ID</Label>
                        <Input {...form.register(`insurances.${index}.member_id`)} placeholder="Member ID" />
                      </div>
                      <div className="space-y-2">
                        <Label>Group Number</Label>
                        <Input {...form.register(`insurances.${index}.group_number`)} placeholder="Group #" />
                      </div>
                    </div>
                  </div>
                ))
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => appendInsurance({ is_primary: insuranceFields.length === 0 })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Insurance
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Notes Section */}
      <Collapsible open={openSections.notes} onOpenChange={() => toggleSection("notes")}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
                {openSections.notes ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Textarea
                {...form.register("notes")}
                placeholder="Additional notes about this client..."
                rows={4}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 md:left-64">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground hidden sm:block">
            All fields are optional. Save when ready.
          </p>
          <Button type="submit" size="lg" disabled={isPending} className="min-w-[140px]">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Client
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

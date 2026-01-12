"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MapPin, Globe2, Building2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  createJobPostingSchema,
  POSITION_TYPES,
  EMPLOYMENT_TYPES,
  SALARY_TYPES,
  BENEFITS_OPTIONS,
  JOB_THERAPY_SETTINGS,
  JOB_SCHEDULE_TYPES,
  JOB_AGE_GROUPS,
  US_STATES,
  type CreateJobPostingData,
  type CreateJobPostingInput,
} from "@/lib/validations/jobs";
import { createJobPosting, updateJobPosting } from "@/lib/actions/jobs";
import type { JobPostingWithRelations } from "@/lib/actions/jobs";

interface Location {
  id: string;
  city: string;
  state: string;
  label?: string;
}

interface JobFormProps {
  locations: Location[];
  initialData?: JobPostingWithRelations;
  mode: "create" | "edit";
}

// Helper to determine initial location type from data
function getInitialLocationType(data?: JobPostingWithRelations): "existing" | "custom" | "remote_only" {
  if (!data) return "existing";
  if (data.customCity && data.customState) return "custom";
  if (!data.locationId && !data.customCity) return "remote_only";
  return "existing";
}

// Helper to determine initial service area type
function getInitialServiceAreaType(data?: JobPostingWithRelations): "nationwide" | "specific" | undefined {
  if (!data?.serviceStates || data.serviceStates.length === 0) return undefined;
  if (data.serviceStates.includes("*")) return "nationwide";
  return "specific";
}

export function JobForm({ locations, initialData, mode }: JobFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationType, setLocationType] = useState<"existing" | "custom" | "remote_only">(
    getInitialLocationType(initialData)
  );
  const [serviceAreaType, setServiceAreaType] = useState<"nationwide" | "specific" | undefined>(
    getInitialServiceAreaType(initialData)
  );

  const form = useForm<CreateJobPostingInput, unknown, CreateJobPostingData>({
    resolver: zodResolver(createJobPostingSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          positionType: initialData.positionType,
          employmentTypes: initialData.employmentTypes,
          locationId: initialData.locationId || undefined,
          customCity: initialData.customCity || undefined,
          customState: initialData.customState || undefined,
          serviceStates: initialData.serviceStates || undefined,
          remoteOption: initialData.remoteOption,
          showSalary: initialData.salaryMin !== null,
          salaryType: initialData.salaryType || undefined,
          salaryMin: initialData.salaryMin || undefined,
          salaryMax: initialData.salaryMax || undefined,
          description: initialData.description || "",
          requirements: initialData.requirements || "",
          benefits: initialData.benefits || [],
          therapySettings: initialData.therapySettings || [],
          scheduleTypes: initialData.scheduleTypes || [],
          ageGroups: initialData.ageGroups || [],
          status: initialData.status === "published" ? "published" : "draft",
        }
      : {
          title: "",
          positionType: undefined,
          employmentTypes: [],
          locationId: undefined,
          customCity: undefined,
          customState: undefined,
          serviceStates: undefined,
          remoteOption: false,
          showSalary: false,
          salaryType: undefined,
          salaryMin: undefined,
          salaryMax: undefined,
          description: "",
          requirements: "",
          benefits: [],
          therapySettings: [],
          scheduleTypes: [],
          ageGroups: [],
          status: "draft",
        },
  });

  const showSalary = form.watch("showSalary");
  const employmentTypes = form.watch("employmentTypes");
  const benefits = form.watch("benefits");
  const therapySettings = form.watch("therapySettings");
  const scheduleTypes = form.watch("scheduleTypes");
  const ageGroups = form.watch("ageGroups");
  const serviceStates = form.watch("serviceStates");

  // Check if job has remote/telehealth settings (needs service area)
  const hasRemoteSettings = useMemo(() => {
    const remoteTelehealthSettings = ["telehealth"];
    return (
      form.watch("remoteOption") ||
      therapySettings?.some((s) => remoteTelehealthSettings.includes(s))
    );
  }, [form, therapySettings]);

  const onSubmit = async (data: CreateJobPostingData) => {
    setIsSubmitting(true);

    try {
      if (mode === "create") {
        const result = await createJobPosting(data);
        if (result.success && result.data) {
          toast.success(
            data.status === "published"
              ? "Job posted successfully!"
              : "Job saved as draft"
          );
          // Redirect to the job view page
          router.push(`/dashboard/jobs/${result.data.id}`);
        } else if (!result.success) {
          toast.error(result.error || "Failed to create job");
          setIsSubmitting(false);
        }
      } else if (initialData) {
        const result = await updateJobPosting(initialData.id, data);
        if (result.success) {
          toast.success("Job updated successfully");
          // Redirect to the job view page
          router.push(`/dashboard/jobs/${initialData.id}`);
        } else {
          toast.error(result.error || "Failed to update job");
          setIsSubmitting(false);
        }
      }
    } catch {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  const handleEmploymentTypeChange = (value: string, checked: boolean) => {
    const current = form.getValues("employmentTypes") || [];
    if (checked) {
      form.setValue("employmentTypes", [...current, value], { shouldValidate: true });
    } else {
      form.setValue(
        "employmentTypes",
        current.filter((v) => v !== value),
        { shouldValidate: true }
      );
    }
  };

  const handleBenefitChange = (value: string, checked: boolean) => {
    const current = form.getValues("benefits") || [];
    if (checked) {
      form.setValue("benefits", [...current, value], { shouldValidate: true });
    } else {
      form.setValue(
        "benefits",
        current.filter((v) => v !== value),
        { shouldValidate: true }
      );
    }
  };

  const handleTherapySettingChange = (value: string, checked: boolean) => {
    const current = form.getValues("therapySettings") || [];
    if (checked) {
      form.setValue("therapySettings", [...current, value], { shouldValidate: true });
    } else {
      form.setValue(
        "therapySettings",
        current.filter((v) => v !== value),
        { shouldValidate: true }
      );
    }
  };

  const handleScheduleTypeChange = (value: string, checked: boolean) => {
    const current = form.getValues("scheduleTypes") || [];
    if (checked) {
      form.setValue("scheduleTypes", [...current, value], { shouldValidate: true });
    } else {
      form.setValue(
        "scheduleTypes",
        current.filter((v) => v !== value),
        { shouldValidate: true }
      );
    }
  };

  const handleAgeGroupChange = (value: string, checked: boolean) => {
    const current = form.getValues("ageGroups") || [];
    if (checked) {
      form.setValue("ageGroups", [...current, value], { shouldValidate: true });
    } else {
      form.setValue(
        "ageGroups",
        current.filter((v) => v !== value),
        { shouldValidate: true }
      );
    }
  };

  const handleServiceStateChange = (value: string, checked: boolean) => {
    const current = form.getValues("serviceStates") || [];
    if (checked) {
      form.setValue("serviceStates", [...current, value], { shouldValidate: true });
    } else {
      form.setValue(
        "serviceStates",
        current.filter((v) => v !== value),
        { shouldValidate: true }
      );
    }
  };

  const handleLocationTypeChange = (value: "existing" | "custom" | "remote_only") => {
    setLocationType(value);
    // Clear conflicting values based on selection
    if (value === "existing") {
      form.setValue("customCity", undefined, { shouldValidate: true });
      form.setValue("customState", undefined, { shouldValidate: true });
    } else if (value === "custom") {
      form.setValue("locationId", undefined, { shouldValidate: true });
    } else if (value === "remote_only") {
      form.setValue("locationId", undefined, { shouldValidate: true });
      form.setValue("customCity", undefined, { shouldValidate: true });
      form.setValue("customState", undefined, { shouldValidate: true });
    }
  };

  const handleServiceAreaTypeChange = (value: "nationwide" | "specific") => {
    setServiceAreaType(value);
    if (value === "nationwide") {
      form.setValue("serviceStates", ["*"], { shouldValidate: true });
    } else {
      // Clear to allow selecting specific states
      form.setValue("serviceStates", [], { shouldValidate: true });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Enter the job title, position type, and employment details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              placeholder="e.g., BCBA - Full Time"
              {...form.register("title")}
              disabled={isSubmitting}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Position Type *</Label>
            <Select
              value={form.watch("positionType") || ""}
              onValueChange={(value) =>
                form.setValue("positionType", value, { shouldValidate: true })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select position type" />
              </SelectTrigger>
              <SelectContent>
                {POSITION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="font-medium">{type.label}</span>
                    <span className="ml-2 text-muted-foreground">
                      - {type.description}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.positionType && (
              <p className="text-sm text-destructive">
                {form.formState.errors.positionType.message}
              </p>
            )}
          </div>

          {/* Work Location */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label className="text-base">Work Location</Label>
              <p className="text-sm text-muted-foreground">
                Where will this position be based?
              </p>
            </div>

            <RadioGroup
              value={locationType}
              onValueChange={(value) => handleLocationTypeChange(value as "existing" | "custom" | "remote_only")}
              disabled={isSubmitting}
              className="space-y-3"
            >
              {/* Existing location option */}
              {locations.length > 0 && (
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="existing" id="loc-existing" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="loc-existing" className="flex cursor-pointer items-center gap-2 font-normal">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Use existing location
                    </Label>
                    {locationType === "existing" && (
                      <Select
                        value={form.watch("locationId") || ""}
                        onValueChange={(value) =>
                          form.setValue("locationId", value, { shouldValidate: true })
                        }
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="w-full sm:w-[300px]">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.label || `${loc.city}, ${loc.state}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              )}

              {/* Custom location option */}
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="custom" id="loc-custom" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="loc-custom" className="flex cursor-pointer items-center gap-2 font-normal">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Custom location
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    For jobs at satellite offices, client sites, or other addresses
                  </p>
                  {locationType === "custom" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="customCity" className="text-xs">City *</Label>
                        <Input
                          id="customCity"
                          placeholder="e.g., Edison"
                          {...form.register("customCity")}
                          disabled={isSubmitting}
                        />
                        {form.formState.errors.customCity && (
                          <p className="text-xs text-destructive">
                            {form.formState.errors.customCity.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="customState" className="text-xs">State *</Label>
                        <Select
                          value={form.watch("customState") || ""}
                          onValueChange={(value) =>
                            form.setValue("customState", value, { shouldValidate: true })
                          }
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.customState && (
                          <p className="text-xs text-destructive">
                            {form.formState.errors.customState.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Remote only option */}
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="remote_only" id="loc-remote" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="loc-remote" className="flex cursor-pointer items-center gap-2 font-normal">
                    <Globe2 className="h-4 w-4 text-muted-foreground" />
                    Fully remote (no physical location)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    For positions that don&apos;t require a physical presence
                  </p>
                </div>
              </div>
            </RadioGroup>

            {form.formState.errors.locationId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.locationId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Employment Type *</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {EMPLOYMENT_TYPES.map((type) => (
                <div
                  key={type.value}
                  className="flex items-center space-x-3 space-y-0"
                >
                  <Checkbox
                    id={`employment-${type.value}`}
                    checked={employmentTypes?.includes(type.value) || false}
                    onCheckedChange={(checked) =>
                      handleEmploymentTypeChange(type.value, !!checked)
                    }
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor={`employment-${type.value}`}
                    className="font-normal cursor-pointer"
                  >
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
            {form.formState.errors.employmentTypes && (
              <p className="text-sm text-destructive">
                {form.formState.errors.employmentTypes.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Remote Work Available</Label>
              <p className="text-sm text-muted-foreground">
                Allow candidates to work remotely or hybrid
              </p>
            </div>
            <Switch
              checked={form.watch("remoteOption") || false}
              onCheckedChange={(checked) =>
                form.setValue("remoteOption", checked)
              }
              disabled={isSubmitting}
            />
          </div>

          {/* Service Area - shown for remote/telehealth jobs */}
          {hasRemoteSettings && (
            <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="space-y-2">
                <Label className="text-base">Service Area</Label>
                <p className="text-sm text-muted-foreground">
                  Which states can candidates be licensed in to qualify for this position?
                </p>
              </div>

              <RadioGroup
                value={serviceAreaType || ""}
                onValueChange={(value) => handleServiceAreaTypeChange(value as "nationwide" | "specific")}
                disabled={isSubmitting}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="nationwide" id="service-nationwide" />
                  <Label htmlFor="service-nationwide" className="cursor-pointer font-normal">
                    Nationwide - candidates from any state
                  </Label>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="specific" id="service-specific" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="service-specific" className="cursor-pointer font-normal">
                      Specific states only
                    </Label>
                    {serviceAreaType === "specific" && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Select states where candidates need to be licensed:
                        </p>
                        <div className="grid max-h-[200px] grid-cols-2 gap-2 overflow-y-auto rounded border bg-white p-2 sm:grid-cols-3 md:grid-cols-4">
                          {US_STATES.map((state) => (
                            <div
                              key={state.value}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`state-${state.value}`}
                                checked={serviceStates?.includes(state.value) || false}
                                onCheckedChange={(checked) =>
                                  handleServiceStateChange(state.value, !!checked)
                                }
                                disabled={isSubmitting}
                              />
                              <Label
                                htmlFor={`state-${state.value}`}
                                className="cursor-pointer text-sm font-normal"
                              >
                                {state.value}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {serviceStates && serviceStates.length > 0 && !serviceStates.includes("*") && (
                          <p className="text-xs text-muted-foreground">
                            {serviceStates.length} state{serviceStates.length !== 1 ? "s" : ""} selected
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Attributes */}
      <Card>
        <CardHeader>
          <CardTitle>Job Attributes</CardTitle>
          <CardDescription>
            Help candidates find the right fit by specifying work settings, schedules, and client age groups.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Therapy Settings */}
          <div className="space-y-3">
            <Label>Work Setting</Label>
            <p className="text-sm text-muted-foreground">
              Where will this position provide services? Select all that apply.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {JOB_THERAPY_SETTINGS.map((setting) => (
                <div
                  key={setting.value}
                  className="flex items-center space-x-3 space-y-0"
                >
                  <Checkbox
                    id={`setting-${setting.value}`}
                    checked={therapySettings?.includes(setting.value) || false}
                    onCheckedChange={(checked) =>
                      handleTherapySettingChange(setting.value, !!checked)
                    }
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor={`setting-${setting.value}`}
                    className="font-normal cursor-pointer"
                  >
                    {setting.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Types */}
          <div className="space-y-3">
            <Label>Schedule</Label>
            <p className="text-sm text-muted-foreground">
              What time of day will this position typically work? Select all that apply.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {JOB_SCHEDULE_TYPES.map((schedule) => (
                <div
                  key={schedule.value}
                  className="flex items-center space-x-3 space-y-0"
                >
                  <Checkbox
                    id={`schedule-${schedule.value}`}
                    checked={scheduleTypes?.includes(schedule.value) || false}
                    onCheckedChange={(checked) =>
                      handleScheduleTypeChange(schedule.value, !!checked)
                    }
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor={`schedule-${schedule.value}`}
                    className="font-normal cursor-pointer"
                  >
                    {schedule.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Age Groups */}
          <div className="space-y-3">
            <Label>Age Groups Served</Label>
            <p className="text-sm text-muted-foreground">
              What client age groups will this position work with? Select all that apply.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {JOB_AGE_GROUPS.map((age) => (
                <div
                  key={age.value}
                  className="flex items-center space-x-3 space-y-0"
                >
                  <Checkbox
                    id={`age-${age.value}`}
                    checked={ageGroups?.includes(age.value) || false}
                    onCheckedChange={(checked) =>
                      handleAgeGroupChange(age.value, !!checked)
                    }
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor={`age-${age.value}`}
                    className="font-normal cursor-pointer"
                  >
                    {age.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compensation */}
      <Card>
        <CardHeader>
          <CardTitle>Compensation</CardTitle>
          <CardDescription>
            Displaying salary information can increase application rates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Show Salary</Label>
              <p className="text-sm text-muted-foreground">
                Display compensation on the job listing
              </p>
            </div>
            <Switch
              checked={showSalary || false}
              onCheckedChange={(checked) =>
                form.setValue("showSalary", checked, { shouldValidate: true })
              }
              disabled={isSubmitting}
            />
          </div>

          {showSalary && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Salary Type *</Label>
                <Select
                  value={form.watch("salaryType") || ""}
                  onValueChange={(value) =>
                    form.setValue("salaryType", value, { shouldValidate: true })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SALARY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.salaryType && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.salaryType.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salaryMin">Minimum *</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  placeholder="e.g., 25"
                  value={form.watch("salaryMin") ?? ""}
                  onChange={(e) =>
                    form.setValue(
                      "salaryMin",
                      e.target.value ? parseInt(e.target.value) : undefined,
                      { shouldValidate: true }
                    )
                  }
                  disabled={isSubmitting}
                />
                {form.formState.errors.salaryMin && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.salaryMin.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salaryMax">Maximum (Optional)</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  placeholder="e.g., 35"
                  value={form.watch("salaryMax") ?? ""}
                  onChange={(e) =>
                    form.setValue(
                      "salaryMax",
                      e.target.value ? parseInt(e.target.value) : undefined,
                      { shouldValidate: true }
                    )
                  }
                  disabled={isSubmitting}
                />
                {form.formState.errors.salaryMax && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.salaryMax.message}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
          <CardDescription>
            Describe the role, responsibilities, and requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Job Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the role, responsibilities, and what a typical day looks like..."
              className="min-h-[200px]"
              {...form.register("description")}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 50 characters. Be specific about what the role involves.
            </p>
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements (Optional)</Label>
            <Textarea
              id="requirements"
              placeholder="List qualifications, certifications, experience requirements..."
              className="min-h-[120px]"
              {...form.register("requirements")}
              disabled={isSubmitting}
            />
            {form.formState.errors.requirements && (
              <p className="text-sm text-destructive">
                {form.formState.errors.requirements.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Benefits</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {BENEFITS_OPTIONS.map((benefit) => (
                <div
                  key={benefit.value}
                  className="flex items-center space-x-3 space-y-0"
                >
                  <Checkbox
                    id={`benefit-${benefit.value}`}
                    checked={benefits?.includes(benefit.value) || false}
                    onCheckedChange={(checked) =>
                      handleBenefitChange(benefit.value, !!checked)
                    }
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor={`benefit-${benefit.value}`}
                    className="font-normal cursor-pointer"
                  >
                    {benefit.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/jobs")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="outline"
          onClick={() => form.setValue("status", "draft")}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save as Draft"
          )}
        </Button>
        <Button
          type="submit"
          onClick={() => form.setValue("status", "published")}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : mode === "create" ? (
            "Publish Job"
          ) : (
            "Update & Publish"
          )}
        </Button>
      </div>
    </form>
  );
}

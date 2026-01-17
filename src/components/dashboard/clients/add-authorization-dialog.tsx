"use client";

import { useState, useTransition, useMemo } from "react";
import { Loader2, Plus, Trash2, Info, Calculator } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { addClientAuthorization } from "@/lib/actions/clients";
import {
  AUTH_PAYOR_TYPE_OPTIONS,
  AUTH_STATUS_OPTIONS,
  SERVICE_BILLING_MAP,
  UNITS_PER_HOUR,
  calculateAuthPeriod,
  calculateServiceUnits,
  type AuthPayorType,
  type AuthStatus,
  type ClientAuthorizationService,
} from "@/lib/validations/clients";

// Service form state type
interface ServiceFormState {
  id: string; // Temporary ID for UI
  serviceType: string;
  billingCode: string;
  customBillingCode: string;
  useAuthDates: boolean;
  startDate: string;
  endDate: string;
  hoursPerWeek: string;
  hoursPerAuth: string;
  unitsPerWeek: string;
  unitsPerAuth: string;
  unitsUsed: string;
  useCalculatedValues: boolean;
  notes: string;
}

// Create a new empty service
function createEmptyService(): ServiceFormState {
  return {
    id: crypto.randomUUID(),
    serviceType: "",
    billingCode: "",
    customBillingCode: "",
    useAuthDates: true,
    startDate: "",
    endDate: "",
    hoursPerWeek: "",
    hoursPerAuth: "",
    unitsPerWeek: "",
    unitsPerAuth: "",
    unitsUsed: "0",
    useCalculatedValues: true,
    notes: "",
  };
}

interface AddAuthorizationDialogProps {
  clientId: string;
  trigger?: React.ReactNode;
}

export function AddAuthorizationDialog({
  clientId,
  trigger,
}: AddAuthorizationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Auth-level form state
  const [payorType, setPayorType] = useState<string>("");
  const [status, setStatus] = useState<string>("draft");
  const [authRefNumber, setAuthRefNumber] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Services array
  const [services, setServices] = useState<ServiceFormState[]>([createEmptyService()]);

  // Calculate auth period metrics
  const authPeriod = useMemo(() => {
    if (!startDate || !endDate) return null;
    return calculateAuthPeriod(startDate, endDate);
  }, [startDate, endDate]);

  // Update service field
  const updateService = (id: string, field: keyof ServiceFormState, value: string | boolean) => {
    setServices(prev => prev.map(svc => {
      if (svc.id !== id) return svc;

      const updated = { ...svc, [field]: value };

      // Auto-fill billing code when service type changes
      if (field === "serviceType") {
        const mapping = SERVICE_BILLING_MAP.find(m => m.code === value);
        if (mapping && value !== "other") {
          updated.billingCode = mapping.code;
        } else if (value === "other") {
          updated.billingCode = "other";
        }
      }

      // Recalculate values if needed
      if (updated.useCalculatedValues && (field === "hoursPerWeek" || field === "useAuthDates" || field === "startDate" || field === "endDate" || field === "useCalculatedValues")) {
        const effectiveStartDate = updated.useAuthDates ? startDate : updated.startDate;
        const effectiveEndDate = updated.useAuthDates ? endDate : updated.endDate;
        const period = calculateAuthPeriod(effectiveStartDate, effectiveEndDate);

        if (period && updated.hoursPerWeek) {
          const hpw = parseFloat(updated.hoursPerWeek);
          if (!isNaN(hpw)) {
            const calc = calculateServiceUnits(hpw, period.totalWeeks);
            updated.hoursPerAuth = calc.hoursPerAuth.toString();
            updated.unitsPerWeek = calc.unitsPerWeek.toString();
            updated.unitsPerAuth = calc.unitsPerAuth.toString();
          }
        }
      }

      return updated;
    }));
  };

  // Add new service
  const addService = () => {
    setServices(prev => [...prev, createEmptyService()]);
  };

  // Remove service
  const removeService = (id: string) => {
    setServices(prev => prev.filter(svc => svc.id !== id));
  };

  // Get service period calculations
  const getServicePeriod = (service: ServiceFormState) => {
    const effectiveStartDate = service.useAuthDates ? startDate : service.startDate;
    const effectiveEndDate = service.useAuthDates ? endDate : service.endDate;
    return calculateAuthPeriod(effectiveStartDate, effectiveEndDate);
  };

  // Get calculation breakdown for tooltip
  const getCalculationBreakdown = (service: ServiceFormState) => {
    const period = getServicePeriod(service);
    if (!period || !service.hoursPerWeek) return null;

    const hpw = parseFloat(service.hoursPerWeek);
    if (isNaN(hpw)) return null;

    return calculateServiceUnits(hpw, period.totalWeeks);
  };

  // Reset form
  const resetForm = () => {
    setPayorType("");
    setStatus("draft");
    setAuthRefNumber("");
    setStartDate("");
    setEndDate("");
    setNotes("");
    setServices([createEmptyService()]);
    setError(null);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate at least one service has required fields
    const validServices = services.filter(svc => svc.serviceType && svc.billingCode);
    if (validServices.length === 0) {
      setError("Please add at least one service with a service type");
      return;
    }

    startTransition(async () => {
      // Convert services to the format expected by the server action
      const servicesToSubmit: Partial<ClientAuthorizationService>[] = validServices.map(svc => ({
        service_type: SERVICE_BILLING_MAP.find(m => m.code === svc.serviceType)?.fullLabel || svc.serviceType,
        billing_code: svc.billingCode === "other" ? svc.customBillingCode : svc.billingCode,
        custom_billing_code: svc.billingCode === "other" ? svc.customBillingCode : undefined,
        use_auth_dates: svc.useAuthDates,
        start_date: svc.useAuthDates ? undefined : svc.startDate || undefined,
        end_date: svc.useAuthDates ? undefined : svc.endDate || undefined,
        hours_per_week: svc.hoursPerWeek ? parseFloat(svc.hoursPerWeek) : undefined,
        hours_per_auth: svc.hoursPerAuth ? parseFloat(svc.hoursPerAuth) : undefined,
        units_per_week: svc.unitsPerWeek ? parseInt(svc.unitsPerWeek, 10) : undefined,
        units_per_auth: svc.unitsPerAuth ? parseInt(svc.unitsPerAuth, 10) : undefined,
        units_used: svc.unitsUsed ? parseInt(svc.unitsUsed, 10) : 0,
        use_calculated_values: svc.useCalculatedValues,
        notes: svc.notes || undefined,
      }));

      const result = await addClientAuthorization(clientId, {
        payor_type: payorType as AuthPayorType || undefined,
        status: status as AuthStatus || "draft",
        auth_reference_number: authRefNumber || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        notes: notes || undefined,
        services: servicesToSubmit as ClientAuthorizationService[],
      });

      if (!result.success) {
        setError(result.error || "Failed to add authorization");
        return;
      }

      resetForm();
      setOpen(false);
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Authorization</DialogTitle>
          <DialogDescription>
            Create a new authorization with one or more services.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Authorization Details */}
          <div className="space-y-4">
            <h3 className="font-medium">Authorization Details</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payor Type</Label>
                <Select value={payorType} onValueChange={setPayorType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payor type" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTH_PAYOR_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTH_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Authorization Reference Number</Label>
              <Input
                value={authRefNumber}
                onChange={(e) => setAuthRefNumber(e.target.value)}
                placeholder="Auth reference number"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Auth Period Calculations */}
            {authPeriod && (
              <div className="rounded-lg bg-muted p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Calculator className="h-4 w-4" />
                  <span className="font-medium">Auth Period</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Days:</span>{" "}
                    <span className="font-medium">{authPeriod.totalCalendarDays}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weeks:</span>{" "}
                    <span className="font-medium">{authPeriod.totalWeeks}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Months:</span>{" "}
                    <span className="font-medium">{authPeriod.totalMonths}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Services */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Services</h3>
              <Button type="button" variant="outline" size="sm" onClick={addService}>
                <Plus className="h-4 w-4 mr-1" />
                Add Service
              </Button>
            </div>

            {services.map((service, index) => {
              const servicePeriod = getServicePeriod(service);
              const calcBreakdown = getCalculationBreakdown(service);
              const isOther = service.serviceType === "other";

              return (
                <div key={service.id} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Service {index + 1}</span>
                    {services.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeService(service.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {/* Service Type Selection */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Service Type</Label>
                      <Select
                        value={service.serviceType}
                        onValueChange={(v) => updateService(service.id, "serviceType", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_BILLING_MAP.map((option) => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.fullLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Billing Code</Label>
                      {isOther ? (
                        <Input
                          value={service.customBillingCode}
                          onChange={(e) => updateService(service.id, "customBillingCode", e.target.value)}
                          placeholder="Enter billing code"
                        />
                      ) : (
                        <Input
                          value={service.billingCode}
                          disabled
                          className="bg-muted"
                        />
                      )}
                    </div>
                  </div>

                  {/* Date Configuration */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`use-auth-dates-${service.id}`}
                        checked={service.useAuthDates}
                        onCheckedChange={(checked) => updateService(service.id, "useAuthDates", !!checked)}
                      />
                      <label
                        htmlFor={`use-auth-dates-${service.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Use auth dates
                        {startDate && endDate && (
                          <span className="text-muted-foreground ml-1">
                            ({format(new Date(startDate), "MM/dd/yy")} - {format(new Date(endDate), "MM/dd/yy")})
                          </span>
                        )}
                      </label>
                    </div>

                    {!service.useAuthDates && (
                      <div className="grid gap-4 sm:grid-cols-2 pl-6">
                        <div className="space-y-2">
                          <Label className="text-sm">Service Start Date</Label>
                          <Input
                            type="date"
                            value={service.startDate}
                            onChange={(e) => updateService(service.id, "startDate", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Service End Date</Label>
                          <Input
                            type="date"
                            value={service.endDate}
                            onChange={(e) => updateService(service.id, "endDate", e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Show service period if different from auth period */}
                    {!service.useAuthDates && servicePeriod && (
                      <div className="pl-6 rounded-lg bg-muted/50 p-2 text-xs">
                        <span className="text-muted-foreground">Service Period: </span>
                        {servicePeriod.totalCalendarDays} days / {servicePeriod.totalWeeks} weeks / {servicePeriod.totalMonths} months
                      </div>
                    )}
                  </div>

                  {/* Hours & Units */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Hours per Week</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.25}
                        value={service.hoursPerWeek}
                        onChange={(e) => updateService(service.id, "hoursPerWeek", e.target.value)}
                        placeholder="Enter hours per week"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`use-calc-${service.id}`}
                        checked={service.useCalculatedValues}
                        onCheckedChange={(checked) => updateService(service.id, "useCalculatedValues", !!checked)}
                      />
                      <label
                        htmlFor={`use-calc-${service.id}`}
                        className="text-sm font-medium leading-none"
                      >
                        Calculate units automatically
                      </label>
                      {calcBreakdown && service.useCalculatedValues && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">{calcBreakdown.calculationBreakdown}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>

                    {/* Calculation display */}
                    {calcBreakdown && service.useCalculatedValues && (
                      <div className="rounded-lg bg-muted/50 p-2 text-sm">
                        <code className="text-xs text-muted-foreground">{calcBreakdown.calculationBreakdown}</code>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Hours/Auth</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.25}
                          value={service.hoursPerAuth}
                          onChange={(e) => updateService(service.id, "hoursPerAuth", e.target.value)}
                          disabled={service.useCalculatedValues}
                          className={service.useCalculatedValues ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Units/Week</Label>
                        <Input
                          type="number"
                          min={0}
                          value={service.unitsPerWeek}
                          onChange={(e) => updateService(service.id, "unitsPerWeek", e.target.value)}
                          disabled={service.useCalculatedValues}
                          className={service.useCalculatedValues ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Units/Auth</Label>
                        <Input
                          type="number"
                          min={0}
                          value={service.unitsPerAuth}
                          onChange={(e) => updateService(service.id, "unitsPerAuth", e.target.value)}
                          disabled={service.useCalculatedValues}
                          className={service.useCalculatedValues ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Units Used</Label>
                        <Input
                          type="number"
                          min={0}
                          value={service.unitsUsed}
                          onChange={(e) => updateService(service.id, "unitsUsed", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Remaining units */}
                    {service.unitsPerAuth && service.unitsUsed && (
                      <div className="text-sm text-muted-foreground">
                        Remaining: <span className="font-medium">{parseInt(service.unitsPerAuth, 10) - parseInt(service.unitsUsed, 10)}</span> units
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this authorization..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Authorization"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

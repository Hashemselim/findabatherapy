"use client";

import { useTransition, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import type { PlaceDetails } from "@/hooks/use-places-autocomplete";
import {
  LOCATION_LABEL_OPTIONS,
  type ClientLocation,
} from "@/lib/validations/clients";
import { addClientLocation, updateClientLocation } from "@/lib/actions/clients";

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

// Explicitly define the form schema to avoid type inference issues with .default()
const formSchema = z.object({
  label: z.string().max(100).optional().or(z.literal("")),
  street_address: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(2).optional().or(z.literal("")),
  postal_code: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code")
    .optional()
    .or(z.literal("")),
  country: z.string().max(2).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  place_id: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  is_primary: z.boolean().optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface LocationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  location?: ClientLocation & { id: string };
  onSuccess?: (location: ClientLocation & { id: string }) => void;
}

export function LocationEditDialog({
  open,
  onOpenChange,
  clientId,
  location,
  onSuccess,
}: LocationEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [addressInput, setAddressInput] = useState("");
  const isEditing = !!location?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      street_address: "",
      city: "",
      state: "",
      postal_code: "",
      country: "US",
      latitude: undefined,
      longitude: undefined,
      place_id: "",
      notes: "",
      is_primary: false,
    },
  });

  // Reset form when dialog opens or location changes
  useEffect(() => {
    if (open) {
      form.reset({
        label: location?.label || "",
        street_address: location?.street_address || "",
        city: location?.city || "",
        state: location?.state || "",
        postal_code: location?.postal_code || "",
        country: location?.country || "US",
        latitude: location?.latitude,
        longitude: location?.longitude,
        place_id: location?.place_id || "",
        notes: location?.notes || "",
        is_primary: location?.is_primary || false,
      });
      setAddressInput(
        location ? [location.street_address, location.city, location.state].filter(Boolean).join(", ") : ""
      );
    }
  }, [open, location, form]);

  const handlePlaceSelect = (place: PlaceDetails) => {
    form.setValue("street_address", place.streetAddress || place.formattedAddress || "");
    form.setValue("city", place.city || "");
    form.setValue("state", place.state || "");
    form.setValue("postal_code", place.postalCode || "");
    form.setValue("latitude", place.latitude);
    form.setValue("longitude", place.longitude);
    form.setValue("place_id", place.placeId || "");
    setAddressInput(place.formattedAddress || "");
  };

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      if (isEditing && location.id) {
        const result = await updateClientLocation(location.id, data);
        if (result.success) {
          onSuccess?.({ ...data, id: location.id } as ClientLocation & { id: string });
          onOpenChange(false);
        } else if (!result.success) {
          form.setError("root", { message: result.error });
        }
      } else {
        const result = await addClientLocation(clientId, data);
        if (result.success && result.data) {
          onSuccess?.({ ...data, id: result.data.id } as ClientLocation & { id: string });
          onOpenChange(false);
          form.reset();
          setAddressInput("");
        } else if (!result.success) {
          form.setError("root", { message: result.error });
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Location" : "Add Location"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the location details."
              : "Add a new location for this client."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {form.formState.errors.root.message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="label">Location Type</Label>
            <Select
              value={form.watch("label") || ""}
              onValueChange={(value) => form.setValue("label", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location type" />
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
            <Label htmlFor="address">Address</Label>
            <PlacesAutocomplete
              value={addressInput}
              onChange={setAddressInput}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Start typing an address..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="street_address">Street Address</Label>
              <Input
                id="street_address"
                {...form.register("street_address")}
                placeholder="123 Main St"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...form.register("city")}
                placeholder="City"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={form.watch("state") || ""}
                onValueChange={(value) => form.setValue("state", value)}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">ZIP Code</Label>
              <Input
                id="postal_code"
                {...form.register("postal_code")}
                placeholder="12345"
              />
              {form.formState.errors.postal_code && (
                <p className="text-xs text-destructive">{form.formState.errors.postal_code.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Additional notes about this location..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="is_primary" className="text-sm font-medium">
                Primary Location
              </Label>
              <p className="text-xs text-muted-foreground">
                Mark this as the primary location
              </p>
            </div>
            <Switch
              id="is_primary"
              checked={form.watch("is_primary")}
              onCheckedChange={(checked) => form.setValue("is_primary", checked)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

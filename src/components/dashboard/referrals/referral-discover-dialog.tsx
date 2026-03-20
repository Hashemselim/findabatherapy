"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Telescope } from "lucide-react";
import { toast } from "sonner";

import { runReferralImport } from "@/lib/actions/referrals";
import { REFERRAL_SOURCE_CATEGORY_OPTIONS } from "@/lib/validations/referrals";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import type { PlaceDetails } from "@/hooks/use-places-autocomplete";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DiscoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Array<{ id: string; label: string | null; city: string; state: string }>;
}

export function ReferralDiscoverDialog({ open, onOpenChange, locations }: DiscoverDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchText, setSearchText] = useState("");
  const [searchPlace, setSearchPlace] = useState<PlaceDetails | null>(null);
  const [locationId, setLocationId] = useState("all");

  function handleDiscover() {
    startTransition(async () => {
      const result = await runReferralImport({
        radiusMiles: 25,
        categories: REFERRAL_SOURCE_CATEGORY_OPTIONS.map((o) => o.value as never),
        locationIds: locationId === "all" ? undefined : [locationId],
        searchText: searchText.trim() || undefined,
        searchCenter: searchPlace
          ? {
              label: searchText,
              city: searchPlace.city || null,
              state: searchPlace.state || null,
              latitude: searchPlace.latitude,
              longitude: searchPlace.longitude,
            }
          : undefined,
        enrichWebsites: false,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to discover sources");
        return;
      }

      toast.success(`Discovered ${result.data?.discovered ?? 0} sources`);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Discover Referral Sources</DialogTitle>
          <DialogDescription>
            Search Google for nearby offices around your locations.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Search near</Label>
            <PlacesAutocomplete
              value={searchText}
              onChange={(v) => {
                setSearchText(v);
                setSearchPlace(null);
              }}
              onPlaceSelect={(place) => {
                setSearchPlace(place);
                setSearchText(place.formattedAddress);
              }}
              placeholder="City, ZIP, or address"
              inputClassName="h-9"
            />
          </div>

          <div className="grid gap-2">
            <Label>Or use agency location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.label || `${loc.city}, ${loc.state}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleDiscover} disabled={isPending}>
            {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Telescope className="mr-1.5 h-3.5 w-3.5" />}
            Discover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

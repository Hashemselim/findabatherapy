"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, Star, MapPin, Loader2, Check, Unlink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { linkGoogleBusiness, unlinkGoogleBusiness } from "@/lib/actions/google-business";
import type { PlacesSearchResult } from "@/app/api/places/search/route";

interface GoogleBusinessLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  locationCity: string;
  locationState: string;
  currentPlaceId: string | null;
  currentRating: number | null;
  currentRatingCount: number | null;
  onSuccess: () => void;
}

export function GoogleBusinessLinkModal({
  open,
  onOpenChange,
  locationId,
  locationCity,
  locationState,
  currentPlaceId,
  currentRating,
  currentRatingCount,
  onSuccess,
}: GoogleBusinessLinkModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<PlacesSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setResults([]);
      setError(null);
      setIsSearching(false);
      setIsLinking(null);
    }
  }, [open]);

  // Debounced search
  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          city: locationCity,
          state: locationState,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Search failed");
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [locationCity, locationState]);

  // Debounce the search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchPlaces(searchQuery);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchPlaces]);

  const handleLink = async (place: PlacesSearchResult) => {
    setIsLinking(place.placeId);
    setError(null);

    const result = await linkGoogleBusiness(
      locationId,
      place.placeId,
      place.rating,
      place.ratingCount
    );

    if (result.success) {
      onSuccess();
      onOpenChange(false);
    } else {
      setError(result.error);
    }

    setIsLinking(null);
  };

  const handleUnlink = async () => {
    setIsUnlinking(true);
    setError(null);

    const result = await unlinkGoogleBusiness(locationId);

    if (result.success) {
      onSuccess();
      onOpenChange(false);
    } else {
      setError(result.error);
    }

    setIsUnlinking(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Link Google Business
          </DialogTitle>
          <DialogDescription>
            Link your Google Business profile to display your Google rating on your listing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Currently linked info */}
          {currentPlaceId && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Currently Linked</p>
                    {currentRating && (
                      <div className="flex items-center gap-1 text-sm text-green-700">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span>{currentRating.toFixed(1)}</span>
                        {currentRatingCount && (
                          <span className="text-green-600">
                            ({currentRatingCount.toLocaleString()} reviews)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlink}
                  disabled={isUnlinking}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {isUnlinking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Unlink className="mr-1 h-4 w-4" />
                      Unlink
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for your business..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search hint */}
          {searchQuery.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Search for your business name to find it on Google Maps
            </p>
          )}

          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </p>
          )}

          {/* Error message */}
          {error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {results.map((place) => (
                <div
                  key={place.placeId}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{place.name}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{place.address}</span>
                    </div>
                    {place.rating && (
                      <div className="mt-1 flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{place.rating.toFixed(1)}</span>
                        {place.ratingCount && (
                          <span className="text-muted-foreground">
                            ({place.ratingCount.toLocaleString()} reviews)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLink(place)}
                    disabled={isLinking === place.placeId || currentPlaceId === place.placeId}
                    className="flex-shrink-0"
                  >
                    {isLinking === place.placeId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : currentPlaceId === place.placeId ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      "Link"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* No results message */}
          {searchQuery.length >= 2 && !isSearching && results.length === 0 && !error && (
            <p className="text-center text-sm text-muted-foreground">
              No businesses found. Try a different search term.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

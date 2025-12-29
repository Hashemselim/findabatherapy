"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  placeId: string;
  formattedAddress: string;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
}

interface UsePlacesAutocompleteOptions {
  // Debounce delay in ms
  debounceMs?: number;
}

interface UsePlacesAutocompleteReturn {
  predictions: PlacePrediction[];
  isLoading: boolean;
  error: string | null;
  search: (input: string) => void;
  clearPredictions: () => void;
  getPlaceDetails: (placeId: string) => Promise<PlaceDetails | null>;
  isReady: boolean;
}

// Generate a unique session token for billing optimization
function generateSessionToken(): string {
  return crypto.randomUUID();
}

export function usePlacesAutocomplete(
  options: UsePlacesAutocompleteOptions = {}
): UsePlacesAutocompleteReturn {
  const { debounceMs = 300 } = options;

  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<string>(generateSessionToken());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const search = useCallback(
    (input: string) => {
      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (!input.trim()) {
        setPredictions([]);
        setError(null);
        return;
      }

      setIsLoading(true);

      debounceTimerRef.current = setTimeout(async () => {
        abortControllerRef.current = new AbortController();

        try {
          const response = await fetch("/api/places/autocomplete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input,
              sessionToken: sessionTokenRef.current,
            }),
            signal: abortControllerRef.current.signal,
          });

          if (!response.ok) {
            throw new Error("Failed to fetch suggestions");
          }

          const data = await response.json();
          setPredictions(data.suggestions || []);
          setError(null);
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            // Request was cancelled, ignore
            return;
          }
          setError("Failed to fetch suggestions");
          setPredictions([]);
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  const clearPredictions = useCallback(() => {
    setPredictions([]);
    setError(null);
  }, []);

  const getPlaceDetails = useCallback(
    async (placeId: string): Promise<PlaceDetails | null> => {
      try {
        const response = await fetch("/api/places/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            placeId,
            sessionToken: sessionTokenRef.current,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch place details");
        }

        const data = await response.json();

        // Generate new session token after completing a session
        sessionTokenRef.current = generateSessionToken();

        return data;
      } catch (err) {
        console.error("Error fetching place details:", err);
        return null;
      }
    },
    []
  );

  return {
    predictions,
    isLoading,
    error,
    search,
    clearPredictions,
    getPlaceDetails,
    // Always ready since we use server-side API
    isReady: true,
  };
}

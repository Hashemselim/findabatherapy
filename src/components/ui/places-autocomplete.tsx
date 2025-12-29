"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  usePlacesAutocomplete,
  type PlacePrediction,
  type PlaceDetails,
} from "@/hooks/use-places-autocomplete";

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceDetails) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
}

export function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "City, State or ZIP",
  className,
  inputClassName,
  showIcon = true,
}: PlacesAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    predictions,
    isLoading,
    search,
    clearPredictions,
    getPlaceDetails,
  } = usePlacesAutocomplete();

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    if (newValue.trim()) {
      search(newValue);
      setIsOpen(true);
    } else {
      clearPredictions();
      setIsOpen(false);
    }
  };

  const handlePredictionSelect = async (prediction: PlacePrediction) => {
    setInputValue(prediction.description);
    onChange(prediction.description);
    setIsOpen(false);
    clearPredictions();

    if (onPlaceSelect) {
      const details = await getPlaceDetails(prediction.placeId);
      if (details) {
        onPlaceSelect(details);
      }
    }
  };

  const handleFocus = () => {
    if (predictions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        {showIcon && (
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(showIcon && "pl-9", inputClassName)}
          autoComplete="off"
        />
        {isLoading && (
          <div className="pointer-events-none absolute right-3 top-0 bottom-0 flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && predictions.length > 0 && (
        <div className="absolute z-[9999] mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {predictions.map((prediction) => (
              <li key={prediction.placeId}>
                <button
                  type="button"
                  onClick={() => handlePredictionSelect(prediction)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{prediction.mainText}</p>
                    {prediction.secondaryText && (
                      <p className="truncate text-xs text-muted-foreground">
                        {prediction.secondaryText}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-3 py-1.5">
            <p className="text-[10px] text-muted-foreground">
              Powered by Google
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

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
  /** Called when the input has text but no place has been selected from dropdown */
  onUnvalidatedInput?: (hasUnvalidatedText: boolean) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
  /** When true, shows the validated value as a yellow pill. Click to edit. */
  showPillWhenValidated?: boolean;
  /** Custom pill class name */
  pillClassName?: string;
  /** When true, treats the initial value as already validated (shows as pill) */
  initialValidated?: boolean;
}

const defaultPillClassName =
  "inline-flex items-center rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground";

export function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onUnvalidatedInput,
  placeholder = "City, State or ZIP",
  className,
  inputClassName,
  showIcon = true,
  showPillWhenValidated = false,
  pillClassName = defaultPillClassName,
  initialValidated = false,
}: PlacesAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  // Track if a valid place has been selected for the current input
  // Use a ref to avoid stale closure issues in blur handler
  // Initialize based on initialValidated prop (for pre-populated values from URL)
  const isValidatedRef = useRef(initialValidated && !!value);
  const [isValidated, setIsValidated] = useState(initialValidated && !!value);
  // Track if we're in editing mode (focused)
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Track the current input value in a ref for blur handler
  const inputValueRef = useRef(value);

  const {
    predictions,
    isLoading,
    search,
    clearPredictions,
    getPlaceDetails,
  } = usePlacesAutocomplete();

  // Sync external value (but don't auto-validate - only selection validates)
  useEffect(() => {
    setInputValue(value);
    inputValueRef.current = value;
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
    inputValueRef.current = newValue;
    onChange(newValue);
    // Mark as unvalidated since user is typing new text
    setIsValidated(false);
    isValidatedRef.current = false;

    // Notify parent that there's unvalidated text (or not)
    onUnvalidatedInput?.(newValue.trim().length > 0);

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
    inputValueRef.current = prediction.description;
    onChange(prediction.description);
    setIsOpen(false);
    clearPredictions();
    // Mark as validated since user selected from dropdown
    setIsValidated(true);
    isValidatedRef.current = true;
    // Notify parent that input is now validated
    onUnvalidatedInput?.(false);

    if (onPlaceSelect) {
      const details = await getPlaceDetails(prediction.placeId);
      if (details) {
        onPlaceSelect(details);
      }
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
    if (predictions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    // Use a small delay to allow click events on dropdown items to fire first
    setTimeout(() => {
      setIsEditing(false);
      // If input has text but wasn't validated (no selection from dropdown), clear it
      // Use refs to get current values (avoid stale closure)
      if (inputValueRef.current.trim() && !isValidatedRef.current) {
        setInputValue("");
        inputValueRef.current = "";
        onChange("");
        clearPredictions();
        onUnvalidatedInput?.(false);
      }
    }, 200);
  };

  const handlePillClick = () => {
    setIsEditing(true);
    // Focus the input after a brief delay to allow state to update
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Should we show the pill display?
  const showPill = showPillWhenValidated && isValidated && inputValue && !isEditing;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {showPill ? (
        // Pill display mode - shows validated value as a clickable pill
        <button
          type="button"
          onClick={handlePillClick}
          className={cn(
            "flex w-full items-center gap-2 border border-border bg-white px-3 text-left text-sm",
            // Default height and rounding
            "h-10 rounded-xl",
            // Apply height/rounding from inputClassName but not padding (pl-9 etc)
            inputClassName?.includes("h-12") && "h-12",
            inputClassName?.includes("rounded-2xl") && "rounded-2xl"
          )}
        >
          {showIcon && (
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className={pillClassName}>{inputValue}</span>
        </button>
      ) : (
        // Input mode - regular text input with autocomplete
        <div className="relative">
          {showIcon && (
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
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
      )}

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

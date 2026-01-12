"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { Filter, X, MapPin, Globe, Clock } from "lucide-react";
import { useDebouncedCallback } from "@/hooks/use-debounce";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  FilterSection,
  FilterSelect,
  FilterToggle,
  FilterCheckboxGroup,
} from "@/components/filters";
import {
  SEARCH_POSITION_OPTIONS,
  EMPLOYMENT_TYPES,
  JOB_THERAPY_SETTINGS,
  JOB_SCHEDULE_TYPES,
  JOB_AGE_GROUPS,
  type SearchPositionType,
  type EmploymentType,
  type JobTherapySetting,
  type JobScheduleType,
  type JobAgeGroup,
} from "@/lib/validations/jobs";
import {
  parseJobFiltersFromParams,
  jobFiltersToSearchParams,
  getPositionLabel,
  getEmploymentLabel,
  getTherapySettingLabel,
  getScheduleTypeLabel,
  getAgeGroupLabel,
  removeArrayFilterValue,
  POSTED_WITHIN_OPTIONS,
  type JobUrlFilters,
} from "@/lib/search/job-filters";

interface JobFiltersProps {
  className?: string;
}

export function JobFilters({ className }: JobFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  // Parse current filters from URL using centralized utility
  const currentFilters = parseJobFiltersFromParams(searchParams);

  // Local state for filters
  const [position, setPosition] = useState<SearchPositionType | undefined>(currentFilters.position);
  const [employment, setEmployment] = useState<EmploymentType | undefined>(currentFilters.employment);
  const [remote, setRemote] = useState(currentFilters.remote || false);
  const [postedWithin, setPostedWithin] = useState<string | undefined>(currentFilters.postedWithin);
  const [therapySettings, setTherapySettings] = useState<JobTherapySetting[]>(currentFilters.therapySettings || []);
  const [scheduleTypes, setScheduleTypes] = useState<JobScheduleType[]>(currentFilters.scheduleTypes || []);
  const [ageGroups, setAgeGroups] = useState<JobAgeGroup[]>(currentFilters.ageGroups || []);

  // Sync local state with URL params when they change externally
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    const filters = parseJobFiltersFromParams(searchParams);
    setPosition(filters.position);
    setEmployment(filters.employment);
    setRemote(filters.remote || false);
    setPostedWithin(filters.postedWithin);
    setTherapySettings(filters.therapySettings || []);
    setScheduleTypes(filters.scheduleTypes || []);
    setAgeGroups(filters.ageGroups || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsString]);

  // Track if this is the initial mount to prevent auto-apply on page load
  const isInitialMount = useRef(true);

  // Debounced auto-apply for desktop sidebar
  const debouncedApply = useDebouncedCallback(() => {
    const currentUrlFilters = parseJobFiltersFromParams(searchParams);
    const newFilters: JobUrlFilters = {
      ...currentUrlFilters,
      position,
      employment,
      remote: remote || undefined,
      postedWithin: postedWithin as "24h" | "7d" | "30d" | undefined,
      therapySettings: therapySettings.length > 0 ? therapySettings : undefined,
      scheduleTypes: scheduleTypes.length > 0 ? scheduleTypes : undefined,
      ageGroups: ageGroups.length > 0 ? ageGroups : undefined,
    };
    const params = jobFiltersToSearchParams(newFilters);
    params.delete("page");
    router.push(`/jobs/search?${params.toString()}`);
  }, 300);

  // Auto-apply filters on desktop when filters change (not on mobile sheet)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Only auto-apply when sheet is closed (desktop mode)
    if (!isOpen) {
      debouncedApply();
    }
  }, [position, employment, remote, postedWithin, therapySettings, scheduleTypes, ageGroups, isOpen, debouncedApply]);

  // Multi-select toggle handler
  const handleArrayToggle = <T extends string>(
    currentArray: T[],
    setArray: React.Dispatch<React.SetStateAction<T[]>>,
    value: T
  ) => {
    if (currentArray.includes(value)) {
      setArray(currentArray.filter((v) => v !== value));
    } else {
      setArray([...currentArray, value]);
    }
  };

  const applyFilters = useCallback(() => {
    const currentUrlFilters = parseJobFiltersFromParams(searchParams);
    const newFilters: JobUrlFilters = {
      ...currentUrlFilters,
      position,
      employment,
      remote: remote || undefined,
      postedWithin: postedWithin as "24h" | "7d" | "30d" | undefined,
      therapySettings: therapySettings.length > 0 ? therapySettings : undefined,
      scheduleTypes: scheduleTypes.length > 0 ? scheduleTypes : undefined,
      ageGroups: ageGroups.length > 0 ? ageGroups : undefined,
    };
    const params = jobFiltersToSearchParams(newFilters);
    params.delete("page");
    startTransition(() => {
      router.push(`/jobs/search?${params.toString()}`);
    });
    setIsOpen(false);
  }, [position, employment, remote, postedWithin, therapySettings, scheduleTypes, ageGroups, searchParams, router]);

  const clearFilters = useCallback(() => {
    setPosition(undefined);
    setEmployment(undefined);
    setRemote(false);
    setPostedWithin(undefined);
    setTherapySettings([]);
    setScheduleTypes([]);
    setAgeGroups([]);

    const currentUrlFilters = parseJobFiltersFromParams(searchParams);
    const newFilters: JobUrlFilters = {
      state: currentUrlFilters.state,
      city: currentUrlFilters.city,
      lat: currentUrlFilters.lat,
      lng: currentUrlFilters.lng,
      radius: currentUrlFilters.radius,
    };
    const params = jobFiltersToSearchParams(newFilters);
    params.delete("page");
    startTransition(() => {
      router.push(`/jobs/search?${params.toString()}`);
    });
    setIsOpen(false);
  }, [searchParams, router]);

  // Count active filters (excluding location)
  const activeFilterCount =
    (currentFilters.position ? 1 : 0) +
    (currentFilters.employment ? 1 : 0) +
    (currentFilters.remote ? 1 : 0) +
    (currentFilters.postedWithin ? 1 : 0) +
    (currentFilters.therapySettings?.length || 0) +
    (currentFilters.scheduleTypes?.length || 0) +
    (currentFilters.ageGroups?.length || 0);

  // Filter content (shared between mobile and desktop)
  const filterContent = (
    <>
      {/* Position Type */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Position Type</Label>
        <FilterSelect
          options={SEARCH_POSITION_OPTIONS}
          value={position}
          onChange={(val) => setPosition(val as SearchPositionType | undefined)}
          placeholder="All positions"
          allLabel="All positions"
        />
      </div>

      {/* Employment Type */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Employment Type</Label>
        <FilterSelect
          options={EMPLOYMENT_TYPES}
          value={employment}
          onChange={(val) => setEmployment(val as EmploymentType | undefined)}
          placeholder="All types"
          allLabel="All types"
        />
      </div>

      {/* Remote Toggle */}
      <FilterToggle
        label="Remote Only"
        description="Show only remote-friendly positions"
        checked={remote}
        onChange={setRemote}
        icon={Globe}
      />

      {/* Posted Within */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Posted Within</Label>
        </div>
        <FilterSelect
          options={POSTED_WITHIN_OPTIONS}
          value={postedWithin}
          onChange={(val) => setPostedWithin(val)}
          placeholder="Any time"
          allLabel="Any time"
        />
      </div>

      {/* Work Setting */}
      <FilterSection title="Work Setting" defaultOpen accentColor="emerald">
        <FilterCheckboxGroup
          options={JOB_THERAPY_SETTINGS}
          selected={therapySettings}
          onChange={(value) => handleArrayToggle(therapySettings, setTherapySettings, value as JobTherapySetting)}
        />
      </FilterSection>

      {/* Schedule */}
      <FilterSection title="Schedule" defaultOpen accentColor="emerald">
        <FilterCheckboxGroup
          options={JOB_SCHEDULE_TYPES}
          selected={scheduleTypes}
          onChange={(value) => handleArrayToggle(scheduleTypes, setScheduleTypes, value as JobScheduleType)}
        />
      </FilterSection>

      {/* Age Groups */}
      <FilterSection title="Age Groups Served" accentColor="emerald">
        <FilterCheckboxGroup
          options={JOB_AGE_GROUPS}
          selected={ageGroups}
          onChange={(value) => handleArrayToggle(ageGroups, setAgeGroups, value as JobAgeGroup)}
        />
      </FilterSection>
    </>
  );

  return (
    <div className={className}>
      {/* Mobile Filter Button + Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2 lg:hidden">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filter Jobs</SheetTitle>
            <SheetDescription>
              Narrow down your job search with these filters.
            </SheetDescription>
          </SheetHeader>
          {/* Scrollable filter content */}
          <div className="mt-6 flex-1 space-y-6 overflow-y-auto pb-4">
            {filterContent}
          </div>
          {/* Sticky footer with Apply button */}
          <div className="sticky bottom-0 border-t bg-background pt-4 pb-2">
            <div className="flex gap-2">
              <Button
                onClick={applyFilters}
                className="flex-1 bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                disabled={isPending}
              >
                Apply Filters
              </Button>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-600"
                disabled={isPending}
              >
                Clear
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - filters auto-apply with debounce */}
      <div className="hidden lg:block">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
              <Filter className="h-5 w-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-emerald-600"
            >
              Clear all
            </Button>
          )}
        </div>
        <div className="space-y-4">{filterContent}</div>
      </div>
    </div>
  );
}

// Active filter badges display
interface ActiveFiltersProps {
  className?: string;
}

export function ActiveJobFilters({ className }: ActiveFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const filters = parseJobFiltersFromParams(searchParams);

  const hasProximitySearch = filters.lat !== undefined && filters.lng !== undefined;
  const hasStateFilter = filters.state && !hasProximitySearch;
  const hasCityFilter = filters.city && !hasProximitySearch;

  const handleRemoveFilter = (key: keyof JobUrlFilters) => {
    const currentFilters = parseJobFiltersFromParams(searchParams);
    const newFilters = { ...currentFilters };

    switch (key) {
      case "position":
        delete newFilters.position;
        break;
      case "employment":
        delete newFilters.employment;
        break;
      case "remote":
        delete newFilters.remote;
        break;
      case "postedWithin":
        delete newFilters.postedWithin;
        break;
      case "state":
        delete newFilters.state;
        break;
      case "city":
        delete newFilters.city;
        break;
      case "lat":
      case "lng":
      case "radius":
        delete newFilters.lat;
        delete newFilters.lng;
        delete newFilters.radius;
        delete newFilters.city;
        delete newFilters.state;
        break;
      case "therapySettings":
        delete newFilters.therapySettings;
        break;
      case "scheduleTypes":
        delete newFilters.scheduleTypes;
        break;
      case "ageGroups":
        delete newFilters.ageGroups;
        break;
    }

    const params = jobFiltersToSearchParams(newFilters);
    params.delete("page");
    startTransition(() => {
      router.push(`/jobs/search?${params.toString()}`);
    });
  };

  const handleRemoveArrayValue = (
    key: "therapySettings" | "scheduleTypes" | "ageGroups",
    value: string
  ) => {
    const currentFilters = parseJobFiltersFromParams(searchParams);
    const newFilters = removeArrayFilterValue(currentFilters, key, value);
    const params = jobFiltersToSearchParams(newFilters);
    params.delete("page");
    startTransition(() => {
      router.push(`/jobs/search?${params.toString()}`);
    });
  };

  const hasFilters =
    filters.position ||
    filters.employment ||
    filters.remote ||
    filters.postedWithin ||
    hasProximitySearch ||
    hasStateFilter ||
    hasCityFilter ||
    (filters.therapySettings && filters.therapySettings.length > 0) ||
    (filters.scheduleTypes && filters.scheduleTypes.length > 0) ||
    (filters.ageGroups && filters.ageGroups.length > 0);

  if (!hasFilters) return null;

  let locationLabel = "";
  if (hasProximitySearch) {
    if (filters.city && filters.state) {
      locationLabel = `${filters.city}, ${filters.state}`;
    } else if (filters.state) {
      locationLabel = filters.state;
    } else {
      locationLabel = "Location set";
    }
    if (filters.radius) {
      locationLabel += ` (${filters.radius} mi)`;
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ""}`}>
      <span className="text-sm text-muted-foreground">Active filters:</span>

      {hasProximitySearch && (
        <Badge
          variant="secondary"
          className="cursor-pointer bg-teal-100 text-teal-700 hover:bg-teal-200"
          onClick={() => handleRemoveFilter("lat")}
        >
          <MapPin className="mr-1 h-3 w-3" />
          {locationLabel}
          <X className="ml-1 h-3 w-3" />
        </Badge>
      )}

      {hasStateFilter && (
        <Badge
          variant="secondary"
          className="cursor-pointer bg-teal-100 text-teal-700 hover:bg-teal-200"
          onClick={() => handleRemoveFilter("state")}
        >
          <MapPin className="mr-1 h-3 w-3" />
          {filters.state}
          <X className="ml-1 h-3 w-3" />
        </Badge>
      )}

      {hasCityFilter && (
        <Badge
          variant="secondary"
          className="cursor-pointer bg-teal-100 text-teal-700 hover:bg-teal-200"
          onClick={() => handleRemoveFilter("city")}
        >
          {filters.city}
          <X className="ml-1 h-3 w-3" />
        </Badge>
      )}

      {filters.position && (
        <Badge
          variant="secondary"
          className="cursor-pointer bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          onClick={() => handleRemoveFilter("position")}
        >
          {getPositionLabel(filters.position)}
          <X className="ml-1 h-3 w-3" />
        </Badge>
      )}

      {filters.employment && (
        <Badge
          variant="secondary"
          className="cursor-pointer bg-blue-100 text-blue-700 hover:bg-blue-200"
          onClick={() => handleRemoveFilter("employment")}
        >
          {getEmploymentLabel(filters.employment)}
          <X className="ml-1 h-3 w-3" />
        </Badge>
      )}

      {filters.remote && (
        <Badge
          variant="secondary"
          className="cursor-pointer bg-purple-100 text-purple-700 hover:bg-purple-200"
          onClick={() => handleRemoveFilter("remote")}
        >
          Remote
          <X className="ml-1 h-3 w-3" />
        </Badge>
      )}

      {filters.postedWithin && (
        <Badge
          variant="secondary"
          className="cursor-pointer bg-amber-100 text-amber-700 hover:bg-amber-200"
          onClick={() => handleRemoveFilter("postedWithin")}
        >
          {POSTED_WITHIN_OPTIONS.find((o) => o.value === filters.postedWithin)?.label}
          <X className="ml-1 h-3 w-3" />
        </Badge>
      )}

      {filters.therapySettings?.map((setting) => (
        <Badge
          key={`setting-${setting}`}
          variant="secondary"
          className="cursor-pointer bg-orange-100 text-orange-700 hover:bg-orange-200"
          onClick={() => handleRemoveArrayValue("therapySettings", setting)}
        >
          {getTherapySettingLabel(setting)}
          <X className="ml-1 h-3 w-3" />
        </Badge>
      ))}

      {filters.scheduleTypes?.map((schedule) => (
        <Badge
          key={`schedule-${schedule}`}
          variant="secondary"
          className="cursor-pointer bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
          onClick={() => handleRemoveArrayValue("scheduleTypes", schedule)}
        >
          {getScheduleTypeLabel(schedule)}
          <X className="ml-1 h-3 w-3" />
        </Badge>
      ))}

      {filters.ageGroups?.map((age) => (
        <Badge
          key={`age-${age}`}
          variant="secondary"
          className="cursor-pointer bg-pink-100 text-pink-700 hover:bg-pink-200"
          onClick={() => handleRemoveArrayValue("ageGroups", age)}
        >
          {getAgeGroupLabel(age)}
          <X className="ml-1 h-3 w-3" />
        </Badge>
      ))}
    </div>
  );
}

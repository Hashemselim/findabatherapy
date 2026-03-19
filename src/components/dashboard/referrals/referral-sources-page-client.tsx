"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  Loader2,
  Mail,
  MapPin,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  enrichReferralSource,
  runReferralImport,
  updateReferralSourceStage,
  type ReferralSourceListItem,
  type ReferralTemplate,
} from "@/lib/actions/referrals";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import type { PlaceDetails } from "@/hooks/use-places-autocomplete";
import { REFERRAL_SOURCE_CATEGORY_OPTIONS, REFERRAL_SOURCE_STAGE_OPTIONS } from "@/lib/validations/referrals";
import { formatDistance } from "@/lib/geo/distance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ReferralStageBadge } from "./referral-stage-badge";
import { ReferralSendDialog } from "./referral-send-dialog";
import { ReferralSourceFormDialog } from "./referral-source-form-dialog";

interface LocationOption {
  id: string;
  label: string | null;
  city: string;
  state: string;
}

export function ReferralSourcesPageClient({
  initialSources,
  templates,
  locations,
}: {
  initialSources: ReferralSourceListItem[];
  templates: ReferralTemplate[];
  locations: LocationOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [finderText, setFinderText] = useState("");
  const [finderPlace, setFinderPlace] = useState<PlaceDetails | null>(null);
  const [hasUnvalidatedFinder, setHasUnvalidatedFinder] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedLocationId, setSelectedLocationId] = useState("all");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [singleSource, setSingleSource] = useState<ReferralSourceListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importLocationId, setImportLocationId] = useState("all");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const filteredSources = useMemo(() => {
    return initialSources.filter((source) => {
      const matchesSearch =
        !tableSearch.trim() ||
        [source.name, source.city, source.state]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(tableSearch.trim().toLowerCase());

      const matchesStage = stageFilter === "all" || source.stage === stageFilter;
      const matchesCategory = categoryFilter === "all" || source.category === categoryFilter;
      const matchesLocation = selectedLocationId === "all" || source.location_id === selectedLocationId;

      return matchesSearch && matchesStage && matchesCategory && matchesLocation;
    });
  }, [categoryFilter, initialSources, selectedLocationId, stageFilter, tableSearch]);

  const allVisibleSelected =
    filteredSources.length > 0 && filteredSources.every((source) => selectedSourceIds.includes(source.id));
  const selectedVisibleCount = filteredSources.filter((source) => selectedSourceIds.includes(source.id)).length;
  const isImporting = isPending && pendingAction === "import";

  function humanizeCategory(category: string) {
    return category.replace(/_/g, " ");
  }

  function getContactMethodLabel(source: ReferralSourceListItem) {
    if (source.public_email) return "Email ready";
    if (source.contact_form_url) return "Contact form";
    if (source.phone) return "Call first";
    if (source.website) return "Website only";
    return "Needs enrichment";
  }

  function getLocationLabel(source: ReferralSourceListItem) {
    return [source.city, source.state].filter(Boolean).join(", ");
  }

  function toggleSourceSelection(sourceId: string, checked: boolean) {
    setSelectedSourceIds((current) =>
      checked ? Array.from(new Set([...current, sourceId])) : current.filter((id) => id !== sourceId)
    );
  }

  function handleImport() {
    setPendingAction("import");
    startTransition(async () => {
      try {
        const result = await runReferralImport({
          radiusMiles: 25,
          categories: REFERRAL_SOURCE_CATEGORY_OPTIONS.map((option) => option.value as never),
          locationIds: importLocationId === "all" ? undefined : [importLocationId],
          searchText: finderText.trim() || undefined,
          searchCenter: finderPlace
            ? {
                label: finderText,
                city: finderPlace.city || null,
                state: finderPlace.state || null,
                latitude: finderPlace.latitude,
                longitude: finderPlace.longitude,
              }
            : undefined,
          enrichWebsites: false,
        });

        if (!result.success) {
          toast.error(result.error || "Failed to import referral sources");
          return;
        }

        toast.success(
          `Imported ${result.data?.discovered || 0} sources. Use Enrich to pull deeper website contact details.`
        );
        router.refresh();
      } finally {
        setPendingAction((current) => (current === "import" ? null : current));
      }
    });
  }

  function handleEnrich(sourceId: string) {
    setPendingAction(`enrich:${sourceId}`);
    startTransition(async () => {
      try {
        const result = await enrichReferralSource(sourceId);
        if (!result.success) {
          toast.error(result.error || "Failed to enrich source");
          return;
        }
        toast.success("Source enriched");
        router.refresh();
      } finally {
        setPendingAction((current) => (current === `enrich:${sourceId}` ? null : current));
      }
    });
  }

  function handleStageChange(sourceId: string, nextStage: string) {
    setPendingAction(`stage:${sourceId}`);
    startTransition(async () => {
      try {
        const result = await updateReferralSourceStage(sourceId, nextStage as never);
        if (!result.success) {
          toast.error(result.error || "Failed to update stage");
          return;
        }
        toast.success("Stage updated");
        router.refresh();
      } finally {
        setPendingAction((current) => (current === `stage:${sourceId}` ? null : current));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Find and Work Referral Sources</CardTitle>
            <CardDescription>
              Pull nearby offices around your agency locations, enrich them, then send 1:1 or bulk outreach.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="finder-search">Find Referral Sources Near</Label>
              <PlacesAutocomplete
                value={finderText}
                onChange={(value) => {
                  setFinderText(value);
                  setFinderPlace(null);
                  if (!value.trim()) {
                    setFinderPlace(null);
                  }
                }}
                onPlaceSelect={(place) => {
                  setFinderPlace(place);
                  setFinderText(place.formattedAddress);
                }}
                onUnvalidatedInput={setHasUnvalidatedFinder}
                placeholder="Enter a city, ZIP, or address"
                inputClassName="h-10"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
              <div className="space-y-2">
                <Label>Import From</Label>
                <Select value={importLocationId} onValueChange={setImportLocationId}>
                  <SelectTrigger className="min-w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.label || `${location.city}, ${location.state}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <Button onClick={handleImport} disabled={isPending} className="gap-2">
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                  Find Sources
                </Button>
                <Button variant="outline" onClick={() => setFormOpen(true)}>
                  Add Manually
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-linear-to-r from-primary/5 via-white to-sky-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">One-click discovery, then deeper enrichment only when you need it.</p>
                  {hasUnvalidatedFinder ? (
                    <p className="text-xs text-amber-700">
                      Suggestions help with accuracy, but the search button can still resolve this for you.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Find Sources pulls Google results first so search returns quickly. Use Enrich on high-value offices when you want deeper contact info.
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  25-mile search radius
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filter and Prioritize</CardTitle>
            <CardDescription>
              Narrow the list, select high-value sources, and send targeted outreach.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="table-search">Search imported offices</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="table-search"
                    value={tableSearch}
                    onChange={(event) => setTableSearch(event.target.value)}
                    placeholder="Search by office name or city"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {REFERRAL_SOURCE_STAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {REFERRAL_SOURCE_CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Agency location</Label>
                <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.label || `${location.city}, ${location.state}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="ghost"
                  className="px-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
                  onClick={() => {
                    setTableSearch("");
                    setStageFilter("all");
                    setCategoryFilter("all");
                    setSelectedLocationId("all");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Visible sources</p>
                <p className="mt-1 text-2xl font-semibold">{filteredSources.length}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected</p>
                <p className="mt-1 text-2xl font-semibold">{selectedSourceIds.length}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ready to contact</p>
                <p className="mt-1 text-2xl font-semibold">
                  {filteredSources.filter((source) => source.stage === "ready_to_contact").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-5 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Referral sources</p>
              <p className="text-sm text-muted-foreground">
                Review nearby offices, track contact quality, and move the best ones into outreach.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-full border px-3 py-2 text-sm">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) =>
                    setSelectedSourceIds(checked ? filteredSources.map((source) => source.id) : [])
                  }
                />
                Select visible
              </label>

              <Button
                variant="outline"
                onClick={() => setBulkDialogOpen(true)}
                disabled={selectedSourceIds.length === 0 || isPending}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                Bulk Send
              </Button>
            </div>
          </div>

          {(isImporting || filteredSources.length > 0) && (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Showing</p>
                <p className="mt-1 text-xl font-semibold">
                  {filteredSources.length} source{filteredSources.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected on screen</p>
                <p className="mt-1 text-xl font-semibold">{selectedVisibleCount}</p>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Import status</p>
                <p className="mt-1 text-xl font-semibold">{isImporting ? "Searching..." : "Ready"}</p>
              </div>
            </div>
          )}

          {isImporting ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-primary/15 bg-linear-to-br from-sky-50 via-white to-primary/5 p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-xs font-medium text-primary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Searching nearby referral sources
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight text-foreground">
                      We&apos;re building a strong local referral list for you.
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      We&apos;re checking Google for nearby offices, sorting the strongest matches, and preparing clean contact-ready records so you&apos;re not left staring at an empty page.
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-white/80 px-4 py-3 text-sm text-muted-foreground shadow-sm">
                    <p className="font-medium text-foreground">What&apos;s happening now</p>
                    <p className="mt-1">Finding offices, checking details, and preparing the first batch of results.</p>
                  </div>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-primary/10">
                  <div className="h-full w-full animate-[shimmer_2.4s_ease-in-out_infinite] bg-[linear-gradient(90deg,rgba(37,99,235,0.15)_0%,rgba(37,99,235,0.7)_50%,rgba(37,99,235,0.15)_100%)] bg-[length:200%_100%]" />
                </div>
              </div>

              <div className="grid gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-5 w-5 rounded-sm" />
                          <Skeleton className="h-6 w-56" />
                          <Skeleton className="h-6 w-28 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-44" />
                        <div className="flex flex-wrap gap-2">
                          <Skeleton className="h-6 w-24 rounded-full" />
                          <Skeleton className="h-6 w-28 rounded-full" />
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:w-[420px]">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredSources.length > 0 ? (
            <div className="grid gap-4">
              {filteredSources.map((source) => {
                const isEnriching = isPending && pendingAction === `enrich:${source.id}`;
                const isStageUpdating = isPending && pendingAction === `stage:${source.id}`;

                return (
                  <div
                    key={source.id}
                    className="rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <Checkbox
                              checked={selectedSourceIds.includes(source.id)}
                              onCheckedChange={(checked) => toggleSourceSelection(source.id, checked === true)}
                              className="mt-1"
                            />
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/dashboard/referrals/sources/${source.id}`}
                                  className="truncate text-base font-semibold text-foreground hover:underline"
                                >
                                  {source.name}
                                </Link>
                                <ReferralStageBadge stage={source.stage} />
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                <span>{humanizeCategory(source.category)}</span>
                                {getLocationLabel(source) ? (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {getLocationLabel(source)}
                                  </span>
                                ) : null}
                                {source.distance_miles != null ? <span>{formatDistance(source.distance_miles)}</span> : null}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="rounded-full px-3 py-1">
                              {getContactMethodLabel(source)}
                            </Badge>
                            <Badge variant="outline" className="rounded-full px-3 py-1">
                              Priority {source.priority_score}/100
                            </Badge>
                            <Badge variant="outline" className="rounded-full px-3 py-1">
                              Confidence {source.confidence_score}/100
                            </Badge>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl border bg-muted/15 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                            <p className="mt-1 break-all text-sm font-medium text-foreground">
                              {source.public_email || "No public email yet"}
                            </p>
                          </div>
                          <div className="rounded-xl border bg-muted/15 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p>
                            <p className="mt-1 text-sm font-medium text-foreground">
                              {source.phone || "No phone found"}
                            </p>
                          </div>
                          <div className="rounded-xl border bg-muted/15 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Website</p>
                            {source.website ? (
                              <a
                                href={source.website}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                              >
                                <Globe className="h-3.5 w-3.5" />
                                Open website
                              </a>
                            ) : (
                              <p className="mt-1 text-sm font-medium text-foreground">No website found</p>
                            )}
                          </div>
                          <div className="rounded-xl border bg-muted/15 p-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Contact form</p>
                            {source.contact_form_url ? (
                              <a
                                href={source.contact_form_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                              >
                                Open form
                              </a>
                            ) : (
                              <p className="mt-1 text-sm font-medium text-foreground">No contact form found</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-3 lg:w-[260px]">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Stage</Label>
                          <Select value={source.stage} onValueChange={(value) => handleStageChange(source.id, value)}>
                            <SelectTrigger className="h-10 bg-white" disabled={isStageUpdating}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {REFERRAL_SOURCE_STAGE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button variant="outline" onClick={() => setSingleSource(source)} className="justify-start">
                          <Mail className="mr-2 h-4 w-4" />
                          Send Intro
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleEnrich(source.id)}
                          disabled={isPending}
                          className="justify-start"
                        >
                          {isEnriching ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                          )}
                          Enrich Contact Info
                        </Button>
                        <Button asChild className="justify-start">
                          <Link href={`/dashboard/referrals/sources/${source.id}`}>Open Source Record</Link>
                        </Button>

                        <div className="rounded-xl border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground">
                          <p className="font-medium text-foreground">Best next move</p>
                          <p className="mt-1">
                            {source.public_email
                              ? "Send an introduction email while this source already has a reachable public inbox."
                              : source.contact_form_url
                                ? "Open the contact form and introduce your agency with a lighter-touch message."
                                : source.phone
                                  ? "Call the office first and ask who handles community referrals."
                                  : "Run enrichment next so the source record becomes easier to work."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed bg-muted/10 p-12 text-center">
              <div className="mx-auto max-w-md space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No referral sources match these filters yet.</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Adjust the filters, search a new area, or add a source manually to start building your referral pipeline.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ReferralSendDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        templates={templates}
        sourceIds={selectedSourceIds}
      />

      <ReferralSendDialog
        open={Boolean(singleSource)}
        onOpenChange={(open) => {
          if (!open) setSingleSource(null);
        }}
        templates={templates}
        sourceIds={singleSource ? [singleSource.id] : []}
        sourceName={singleSource?.name}
      />

      <ReferralSourceFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

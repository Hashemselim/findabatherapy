"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Telescope } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  enrichReferralSource,
  updateReferralSourceStage,
  type ReferralSourceListItem,
  type ReferralTemplate,
} from "@/lib/actions/referrals";
import type { ReferralSourceStage } from "@/lib/validations/referrals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardCard, DashboardTabsList, DashboardTabsTrigger } from "@/components/dashboard/ui";
import { Tabs } from "@/components/ui/tabs";
import {
  ReferralNetworkTable,
  type SortKey,
  type SortDirection,
} from "./referral-network-table";
import { ReferralBulkActionBar } from "./referral-bulk-action-bar";
import { ReferralSourceSheet } from "./referral-source-sheet";
import { ReferralSendDialog } from "./referral-send-dialog";
import { ReferralDiscoverDialog } from "./referral-discover-dialog";
import { ReferralStageChangeDialog } from "./referral-stage-change-dialog";

/* ─────────────────────────── types ─────────────────────────── */

interface LocationOption {
  id: string;
  label: string | null;
  city: string;
  state: string;
}

interface ReferralNetworkWorkspaceProps {
  sources: ReferralSourceListItem[];
  templates: ReferralTemplate[];
  locations: LocationOption[];
  previewMode?: boolean;
}

/* ─────────────────────────── stage tabs ─────────────────────── */

const STAGE_TABS = [
  { value: "all", label: "All" },
  { value: "discovered", label: "New" },
  { value: "ready_to_contact", label: "Ready" },
  { value: "contacted", label: "Contacted" },
  { value: "active_referrer", label: "Active" },
  { value: "do_not_contact", label: "DNC" },
  { value: "archived", label: "Archived" },
] as const;

interface StageCounts {
  all: number;
  discovered: number;
  ready_to_contact: number;
  contacted: number;
  active_referrer: number;
  do_not_contact: number;
  archived: number;
}

/* ─────────────────────────── stat pill ─────────────────────── */

function StatPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold leading-none",
          tone === "success" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
          tone === "danger" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
          tone === "default" && "bg-muted text-muted-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ─────────────────────────── component ─────────────────────── */

export function ReferralNetworkWorkspace({
  sources,
  templates,
  locations,
  previewMode = false,
}: ReferralNetworkWorkspaceProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Filters
  const [stageTab, setStageTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Table state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Sheet/dialog state
  const [sheetSourceId, setSheetSourceId] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSourceIds, setEmailSourceIds] = useState<string[]>([]);
  const [emailSourceName, setEmailSourceName] = useState<string | undefined>();
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [stageChangeOpen, setStageChangeOpen] = useState(false);
  const [stageChangeIds, setStageChangeIds] = useState<string[]>([]);

  /* ── computed ── */

  const stageCounts = useMemo<StageCounts>(() => {
    const counts: StageCounts = {
      all: 0,
      discovered: 0,
      ready_to_contact: 0,
      contacted: 0,
      active_referrer: 0,
      do_not_contact: 0,
      archived: 0,
    };
    for (const s of sources) {
      // "all" counts everything except archived
      if (s.stage !== "archived") counts.all++;
      if (s.stage in counts) counts[s.stage as keyof StageCounts]++;
      // Count qualified + engaged in nearby buckets
      if (s.stage === "qualified") counts.discovered++;
      if (s.stage === "engaged") counts.contacted++;
      if (s.stage === "nurture") counts.contacted++;
    }
    return counts;
  }, [sources]);

  const filteredSources = useMemo(() => {
    let result = sources;

    // Stage tab filter — "all" excludes archived
    if (stageTab === "all") {
      result = result.filter((s) => s.stage !== "archived");
    } else if (stageTab === "discovered") {
      result = result.filter((s) => s.stage === "discovered" || s.stage === "qualified");
    } else if (stageTab === "contacted") {
      result = result.filter((s) => s.stage === "contacted" || s.stage === "engaged" || s.stage === "nurture");
    } else {
      result = result.filter((s) => s.stage === stageTab);
    }

    if (categoryFilter !== "all") {
      result = result.filter((s) => s.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q) ||
          s.public_email?.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      switch (sortKey) {
        case "name": return a.name.localeCompare(b.name) * dir;
        case "category": return a.category.localeCompare(b.category) * dir;
        case "stage": return a.stage.localeCompare(b.stage) * dir;
        case "priority": return (a.priority_score - b.priority_score) * dir;
        case "last_contacted": {
          const aTime = a.last_contacted_at ? new Date(a.last_contacted_at).getTime() : 0;
          const bTime = b.last_contacted_at ? new Date(b.last_contacted_at).getTime() : 0;
          return (aTime - bTime) * dir;
        }
        default: return 0;
      }
    });

    return result;
  }, [sources, stageTab, categoryFilter, searchQuery, sortKey, sortDirection]);

  /* ── unique categories from data ── */
  const uniqueCategories = useMemo(() => {
    const cats = new Set(sources.map((s) => s.category));
    return Array.from(cats).sort();
  }, [sources]);

  /* ── handlers ── */

  function handleSortChange(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }

  function handleRowClick(source: ReferralSourceListItem) {
    if (previewMode) return;
    setSheetSourceId(source.id);
  }

  function handleQuickEmail(source: ReferralSourceListItem) {
    if (previewMode) return;
    setEmailSourceIds([source.id]);
    setEmailSourceName(source.name);
    setEmailOpen(true);
  }

  function handleBulkEmail() {
    if (previewMode) return;
    setEmailSourceIds([...selectedIds]);
    setEmailSourceName(undefined);
    setEmailOpen(true);
  }

  function handleBulkStageChange() {
    if (previewMode) return;
    setStageChangeIds([...selectedIds]);
    setStageChangeOpen(true);
  }

  function handleStageChange(sourceId: string, stage: string) {
    if (previewMode) return;
    startTransition(async () => {
      const result = await updateReferralSourceStage(sourceId, stage as ReferralSourceStage);
      if (!result.success) {
        toast.error(result.error || "Failed to update stage");
        return;
      }
      toast.success("Stage updated");
      router.refresh();
    });
  }

  function handleEnrich(sourceId: string) {
    if (previewMode) return;
    const sourceName = sources.find((s) => s.id === sourceId)?.name ?? "Source";
    const toastId = toast.loading(`Enriching ${sourceName}...`, { description: "Crawling website for contact info" });
    startTransition(async () => {
      const result = await enrichReferralSource(sourceId);
      if (!result.success) {
        toast.error(result.error || "Failed to enrich", { id: toastId });
        return;
      }
      const data = result.data!;
      if (data.found.length === 0 && !data.stageChanged) {
        toast.info("No new info found", { id: toastId, description: "Try again later or add contact info manually" });
      } else {
        const parts: string[] = [];
        if (data.found.length > 0) parts.push(`Found: ${data.found.join(", ")}`);
        if (data.stageChanged && data.newStage) parts.push(`Stage → ${data.newStage.replace(/_/g, " ")}`);
        toast.success("Enrichment complete", { id: toastId, description: parts.join(" · ") });
      }
      router.refresh();
    });
  }

  function handleBulkEnrich() {
    if (previewMode) return;
    const count = selectedIds.size;
    const toastId = toast.loading(`Enriching ${count} source${count !== 1 ? "s" : ""}...`, { description: "This may take a moment" });
    startTransition(async () => {
      let enriched = 0;
      let totalFound = 0;
      for (const id of selectedIds) {
        const result = await enrichReferralSource(id);
        if (result.success) {
          enriched++;
          totalFound += result.data!.found.length;
        }
      }
      const desc = totalFound > 0
        ? `Found new info for ${totalFound} field${totalFound !== 1 ? "s" : ""}`
        : "No new info found";
      toast.success(`Enriched ${enriched} source${enriched !== 1 ? "s" : ""}`, { id: toastId, description: desc });
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function handleBulkArchive() {
    if (previewMode) return;
    startTransition(async () => {
      let successCount = 0;
      for (const id of selectedIds) {
        const result = await updateReferralSourceStage(id, "archived" as ReferralSourceStage);
        if (result.success) successCount++;
      }
      toast.success(`Archived ${successCount} source${successCount !== 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <DashboardCard className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatPill label="Total" value={stageCounts.all} />
          <StatPill label="New" value={stageCounts.discovered} />
          <StatPill label="Ready" value={stageCounts.ready_to_contact} />
          <StatPill label="Contacted" value={stageCounts.contacted} />
          <StatPill label="Active Referrers" value={stageCounts.active_referrer} tone="success" />
          <StatPill label="DNC" value={stageCounts.do_not_contact} tone="danger" />
        </div>
      </DashboardCard>

      {/* Filters */}
      <DashboardCard className="space-y-3 px-4 py-3">
        <Tabs value={stageTab} onValueChange={setStageTab}>
          <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide">
          <DashboardTabsList className="inline-flex w-auto min-w-0 flex-nowrap">
            {STAGE_TABS.map((tab) => {
              const count = stageCounts[tab.value as keyof StageCounts] ?? 0;
              const isActive = stageTab === tab.value;
              return (
                <DashboardTabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium leading-none",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </DashboardTabsTrigger>
              );
            })}
          </DashboardTabsList>
          </div>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-9 text-sm"
              placeholder="Search by name, city, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {uniqueCategories.map((cat) => (
                <SelectItem key={cat} value={cat} className="capitalize">
                  {cat.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setDiscoverOpen(true)}
            disabled={previewMode}
          >
            <Telescope className="mr-1.5 h-3.5 w-3.5" />
            {previewMode ? "Discover (Preview)" : "Discover"}
          </Button>
        </div>
      </DashboardCard>

      {/* Bulk action bar */}
      <ReferralBulkActionBar
        count={selectedIds.size}
        onEmail={handleBulkEmail}
        onStageChange={handleBulkStageChange}
        onEnrich={handleBulkEnrich}
        onArchive={handleBulkArchive}
        onClear={() => setSelectedIds(new Set())}
        disabled={previewMode}
      />

      {/* Table */}
      <DashboardCard className="p-0">
        <ReferralNetworkTable
          sources={filteredSources}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={handleRowClick}
          onQuickEmail={handleQuickEmail}
          onStageChange={handleStageChange}
          onEnrich={handleEnrich}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          previewMode={previewMode}
        />
      </DashboardCard>

      {!previewMode && (
        <>
          <ReferralSourceSheet
            sourceId={sheetSourceId}
            onClose={() => setSheetSourceId(null)}
            templates={templates}
            onSendEmail={(id, name) => {
              setEmailSourceIds([id]);
              setEmailSourceName(name);
              setEmailOpen(true);
            }}
          />

          <ReferralSendDialog
            open={emailOpen}
            onOpenChange={setEmailOpen}
            templates={templates}
            sourceIds={emailSourceIds}
            sourceName={emailSourceName}
          />

          <ReferralDiscoverDialog
            open={discoverOpen}
            onOpenChange={setDiscoverOpen}
            locations={locations}
          />

          <ReferralStageChangeDialog
            open={stageChangeOpen}
            onOpenChange={setStageChangeOpen}
            sourceIds={stageChangeIds}
          />
        </>
      )}
    </div>
  );
}

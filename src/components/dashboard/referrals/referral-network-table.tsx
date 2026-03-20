"use client";

import { Archive, ArrowUpDown, Ban, Mail, MoreHorizontal, Sparkles } from "lucide-react";

import type { ReferralSourceListItem } from "@/lib/actions/referrals";
import { REFERRAL_SOURCE_CATEGORY_OPTIONS } from "@/lib/validations/referrals";
import { formatDistance } from "@/lib/geo/distance";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeader,
  DashboardTableRow,
} from "@/components/dashboard/ui";
import { ReferralStageBadge } from "./referral-stage-badge";
import { ReferralContactChannelIcons } from "./referral-contact-channel-icons";

export type SortKey = "name" | "category" | "distance" | "priority" | "last_contacted" | "stage";
export type SortDirection = "asc" | "desc";

interface ReferralNetworkTableProps {
  sources: ReferralSourceListItem[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onRowClick: (source: ReferralSourceListItem) => void;
  onQuickEmail: (source: ReferralSourceListItem) => void;
  onStageChange: (sourceId: string, stage: string) => void;
  onEnrich: (sourceId: string) => void;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSortChange: (key: SortKey) => void;
}

function getCategoryLabel(value: string) {
  return REFERRAL_SOURCE_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value.replace(/_/g, " ");
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* ── Column width constants ────────────────────────────────── */
const COL = {
  checkbox: "w-10",
  name: "max-w-[220px]",
  category: "hidden lg:table-cell w-20",
  contact: "hidden sm:table-cell w-16",
  stage: "w-32",
  lastContacted: "hidden xl:table-cell w-24",
  priority: "hidden xl:table-cell w-20",
  actions: "w-10",
} as const;

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir: _currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <DashboardTableHead className={className}>
      <button
        className="inline-flex items-center gap-1 text-xs font-medium hover:text-foreground"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "text-foreground" : "text-muted-foreground/40"}`} />
      </button>
    </DashboardTableHead>
  );
}

export function ReferralNetworkTable({
  sources,
  selectedIds,
  onSelectionChange,
  onRowClick,
  onQuickEmail,
  onStageChange,
  onEnrich,
  sortKey,
  sortDirection,
  onSortChange,
}: ReferralNetworkTableProps) {
  const allSelected = sources.length > 0 && sources.every((s) => selectedIds.has(s.id));
  const someSelected = sources.some((s) => selectedIds.has(s.id)) && !allSelected;

  function toggleAll() {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(sources.map((s) => s.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  }

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">No referral sources yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use the Discover button to search for nearby doctors and offices.
        </p>
      </div>
    );
  }

  return (
    <DashboardTable>
      <DashboardTableHeader>
        <DashboardTableRow>
          <DashboardTableHead className={COL.checkbox}>
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={toggleAll}
              aria-label="Select all"
            />
          </DashboardTableHead>
          <SortHeader label="Name" sortKey="name" currentKey={sortKey} currentDir={sortDirection} onSort={onSortChange} className={COL.name} />
          <SortHeader label="Type" sortKey="category" currentKey={sortKey} currentDir={sortDirection} onSort={onSortChange} className={COL.category} />
          <DashboardTableHead className={COL.contact} />
          <SortHeader label="Stage" sortKey="stage" currentKey={sortKey} currentDir={sortDirection} onSort={onSortChange} className={COL.stage} />
          <SortHeader label="Contacted" sortKey="last_contacted" currentKey={sortKey} currentDir={sortDirection} onSort={onSortChange} className={COL.lastContacted} />
          <SortHeader label="Score" sortKey="priority" currentKey={sortKey} currentDir={sortDirection} onSort={onSortChange} className={COL.priority} />
          <DashboardTableHead className={COL.actions} />
        </DashboardTableRow>
      </DashboardTableHeader>
      <DashboardTableBody>
        {sources.map((source) => (
          <DashboardTableRow
            key={source.id}
            className="cursor-pointer"
            onClick={() => onRowClick(source)}
          >
            <DashboardTableCell className={COL.checkbox} onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selectedIds.has(source.id)}
                onCheckedChange={() => toggleOne(source.id)}
                aria-label={`Select ${source.name}`}
              />
            </DashboardTableCell>
            <DashboardTableCell className={COL.name}>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">{source.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[source.city, source.state].filter(Boolean).join(", ")}
                  {source.distance_miles != null && ` · ${formatDistance(source.distance_miles)}`}
                </p>
              </div>
            </DashboardTableCell>
            <DashboardTableCell className={COL.category}>
              <span className="text-xs text-muted-foreground">{getCategoryLabel(source.category)}</span>
            </DashboardTableCell>
            <DashboardTableCell className={COL.contact} onClick={(e) => e.stopPropagation()}>
              <ReferralContactChannelIcons
                contactability={source.contactability}
                email={source.public_email}
                phone={source.phone}
                website={source.website}
                contactFormUrl={source.contact_form_url}
              />
            </DashboardTableCell>
            <DashboardTableCell className={COL.stage}>
              <ReferralStageBadge stage={source.stage} />
            </DashboardTableCell>
            <DashboardTableCell className={COL.lastContacted}>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(source.last_contacted_at)}
              </span>
            </DashboardTableCell>
            <DashboardTableCell className={COL.priority}>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-10 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/60"
                    style={{ width: `${Math.min(source.priority_score, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{source.priority_score}</span>
              </div>
            </DashboardTableCell>
            <DashboardTableCell className={COL.actions} onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {source.public_email && (
                    <DropdownMenuItem onClick={() => onQuickEmail(source)}>
                      <Mail className="mr-2 h-3.5 w-3.5" />
                      Send Email
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEnrich(source.id)}>
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    Enrich
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onStageChange(source.id, "do_not_contact")}>
                    <Ban className="mr-2 h-3.5 w-3.5" />
                    Do Not Contact
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStageChange(source.id, "archived")}>
                    <Archive className="mr-2 h-3.5 w-3.5" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </DashboardTableCell>
          </DashboardTableRow>
        ))}
      </DashboardTableBody>
    </DashboardTable>
  );
}

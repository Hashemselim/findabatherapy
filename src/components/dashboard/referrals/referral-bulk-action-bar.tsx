"use client";

import { Archive, Ban, Mail, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BulkActionBarProps {
  count: number;
  onEmail: () => void;
  onStageChange: () => void;
  onEnrich: () => void;
  onArchive: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function ReferralBulkActionBar({
  count,
  onEmail,
  onStageChange,
  onEnrich,
  onArchive,
  onClear,
  disabled = false,
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">
        {count} selected
      </span>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEmail} disabled={disabled}>
          <Mail className="mr-1.5 h-3 w-3" />
          Email
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onStageChange} disabled={disabled}>
          <Ban className="mr-1.5 h-3 w-3" />
          Change Stage
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEnrich} disabled={disabled}>
          <Sparkles className="mr-1.5 h-3 w-3" />
          Enrich
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onArchive} disabled={disabled}>
          <Archive className="mr-1.5 h-3 w-3" />
          Archive
        </Button>
      </div>
      <Button size="sm" variant="ghost" className="ml-auto h-7 w-7 p-0" onClick={onClear} disabled={disabled}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

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
}

export function ReferralBulkActionBar({ count, onEmail, onStageChange, onEnrich, onArchive, onClear }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">
        {count} selected
      </span>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEmail}>
          <Mail className="mr-1.5 h-3 w-3" />
          Email
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onStageChange}>
          <Ban className="mr-1.5 h-3 w-3" />
          Change Stage
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEnrich}>
          <Sparkles className="mr-1.5 h-3 w-3" />
          Enrich
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onArchive}>
          <Archive className="mr-1.5 h-3 w-3" />
          Archive
        </Button>
      </div>
      <Button size="sm" variant="ghost" className="ml-auto h-7 w-7 p-0" onClick={onClear}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

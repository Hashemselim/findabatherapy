"use client";

import { useState } from "react";
import { Check, Copy, Pencil, Plus, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Email provider options for the email dropdown
export const EMAIL_PROVIDER_OPTIONS = [
  { value: "apple_mail", label: "Apple Mail" },
  { value: "gmail", label: "Gmail" },
  { value: "outlook", label: "Outlook" },
  { value: "yahoo", label: "Yahoo" },
] as const;

export type EmailProvider = (typeof EMAIL_PROVIDER_OPTIONS)[number]["value"];

// Helper to get display label from option arrays
export function getOptionLabel<
  T extends readonly { value: string; label: string }[],
>(options: T, value: string | null | undefined): string | null {
  if (!value) return null;
  const option = options.find((o) => o.value === value);
  return option?.label || value;
}

// Copy button component
export function CopyButton({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-primary" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copied!" : `Copy ${label}`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Section header component
interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  badgeCount?: number;
  badgeLabel?: string;
  onEdit?: () => void;
  onAdd?: () => void;
  rightContent?: React.ReactNode;
}

export function SectionHeader({
  icon: Icon,
  title,
  badgeCount,
  badgeLabel,
  onEdit,
  onAdd,
  rightContent,
}: SectionHeaderProps) {
  return (
    <div className="-mx-6 -mt-6 mb-4 flex items-center justify-between rounded-t-lg bg-primary/10 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-semibold text-foreground">
          {title}
        </span>
        {badgeCount !== undefined && badgeCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {badgeLabel ? `${badgeCount} ${badgeLabel}` : badgeCount}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {rightContent}
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="mr-1 h-4 w-4" />
            Edit
          </Button>
        )}
        {onAdd && (
          <Button variant="ghost" size="sm" onClick={onAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        )}
      </div>
    </div>
  );
}

// Field component - simple label/value display
export function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return null;

  return (
    <div className={cn("group py-2", className)}>
      <p className="mb-0.5 text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        <p className="wrap-break-word text-sm font-medium">{value}</p>
        <CopyButton value={value} label={label.toLowerCase()} />
      </div>
    </div>
  );
}

// Full-width field for longer text content
export function FullWidthField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="group">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 whitespace-pre-wrap text-sm">{value}</p>
        <CopyButton value={value} label={label.toLowerCase()} />
      </div>
    </div>
  );
}

// Empty state placeholder
export function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-4 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

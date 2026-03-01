"use client";

import { Eye, Lock, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useUpgradeModal,
  UpgradeModal,
} from "@/components/billing/upgrade-modal";
import { trackUpgradeModalOpened } from "@/lib/posthog/events";

interface PreviewBannerProps {
  message: string;
  variant: "inline" | "public";
  className?: string;
  ctaText?: string;
  triggerFeature?: string;
}

export function PreviewBanner({
  message,
  variant,
  className,
  ctaText = "Go Live — $79/mo",
  triggerFeature,
}: PreviewBannerProps) {
  const { isOpen, openUpgradeModal, setIsOpen, triggerFeature: modalFeature, defaultPlan } =
    useUpgradeModal();

  const handleClick = () => {
    openUpgradeModal({ feature: triggerFeature, source: "preview_banner" });
    trackUpgradeModalOpened({ source: "preview_banner", triggerFeature });
  };

  if (variant === "public") {
    return (
      <>
        <div
          className={cn(
            "flex w-full items-center justify-between bg-amber-500 px-4 py-2 text-white",
            className
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye className="h-4 w-4" />
            <span>{message}</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleClick}
            className="shrink-0"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {ctaText}
          </Button>
        </div>
        <UpgradeModal
          open={isOpen}
          onOpenChange={setIsOpen}
          triggerFeature={modalFeature}
          defaultPlan={defaultPlan}
        />
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "mb-4 flex w-full items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30",
          className
        )}
      >
        <div className="flex items-center gap-2.5">
          <Badge
            variant="outline"
            className="border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-900/50 dark:text-amber-300"
          >
            PREVIEW
          </Badge>
          <span className="text-sm text-amber-800 dark:text-amber-300">
            {message}
          </span>
        </div>
        <Button size="sm" onClick={handleClick} className="shrink-0">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {ctaText}
        </Button>
      </div>
      <UpgradeModal
        open={isOpen}
        onOpenChange={setIsOpen}
        triggerFeature={modalFeature}
        defaultPlan={defaultPlan}
      />
    </>
  );
}

interface LockedButtonProps {
  label: string;
  className?: string;
}

export function LockedButton({ label, className }: LockedButtonProps) {
  const { isOpen, openUpgradeModal, setIsOpen, triggerFeature, defaultPlan } =
    useUpgradeModal();

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "cursor-pointer text-muted-foreground opacity-70 hover:opacity-100",
          className
        )}
        onClick={() => {
          openUpgradeModal({ feature: label, source: "locked_button" });
          trackUpgradeModalOpened({ source: "locked_button", triggerFeature: label });
        }}
      >
        <Lock className="mr-1.5 h-3.5 w-3.5" />
        {label}
      </Button>
      <UpgradeModal
        open={isOpen}
        onOpenChange={setIsOpen}
        triggerFeature={triggerFeature}
        defaultPlan={defaultPlan}
      />
    </>
  );
}

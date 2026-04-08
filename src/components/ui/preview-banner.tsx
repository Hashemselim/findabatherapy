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
            "flex w-full flex-col gap-3 bg-amber-500 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2",
            className
          )}
        >
          <div className="flex w-full items-start gap-2 text-sm font-medium sm:w-auto sm:flex-1 sm:items-center">
            <Eye className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
            <span className="leading-5 sm:leading-normal">{message}</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleClick}
            className="w-full shrink-0 sm:w-auto"
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
          "mb-4 flex w-full flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
          className
        )}
      >
        <div className="flex w-full items-start gap-2.5 sm:w-auto sm:flex-1 sm:items-center">
          <Badge
            variant="outline"
            className="mt-0.5 shrink-0 border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-900/50 dark:text-amber-300 sm:mt-0"
          >
            PREVIEW
          </Badge>
          <span className="text-sm leading-5 text-amber-800 dark:text-amber-300 sm:leading-normal">
            {message}
          </span>
        </div>
        <Button size="sm" onClick={handleClick} className="w-full shrink-0 sm:w-auto">
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

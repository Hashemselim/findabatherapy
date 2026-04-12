import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";

import { BrandedLogo } from "@/components/branded/branded-logo";
import { Button } from "@/components/ui/button";
import { getContrastingTextColor, getSolidBrandButtonStyles } from "@/lib/utils/brand-color";

function getLighterShade(hexColor: string, opacity = 0.1) {
  return `${hexColor}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

type CompletionAction = {
  href: string;
  label: string;
  external?: boolean;
  variant?: "default" | "outline";
};

type CompletionSummaryItem = {
  label: string;
  value: string;
};

interface BrandedCompletionPageProps {
  agencyName: string;
  brandColor: string;
  logoUrl?: string | null;
  showPoweredBy?: boolean;
  title: string;
  description: string;
  summaryItems?: CompletionSummaryItem[];
  primaryAction?: CompletionAction | null;
  secondaryAction?: CompletionAction | null;
  children?: ReactNode;
}

function ActionButton({
  action,
  brandColor,
}: {
  action: CompletionAction;
  brandColor: string;
}) {
  const content = (
    <>
      {action.label}
      {action.external ? <ExternalLink className="h-4 w-4" /> : null}
    </>
  );

  if (action.external) {
    return (
      <Button
        asChild
        variant={action.variant === "outline" ? "outline" : "default"}
        className="gap-2"
        style={action.variant === "outline" ? undefined : getSolidBrandButtonStyles(brandColor)}
      >
        <a href={action.href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant={action.variant === "outline" ? "outline" : "default"}
      className="gap-2"
      style={action.variant === "outline" ? undefined : getSolidBrandButtonStyles(brandColor)}
    >
      <Link href={action.href}>{content}</Link>
    </Button>
  );
}

export function BrandedCompletionPage({
  agencyName,
  brandColor,
  logoUrl,
  showPoweredBy = true,
  title,
  description,
  summaryItems = [],
  primaryAction,
  secondaryAction,
  children,
}: BrandedCompletionPageProps) {
  const contrastColor = getContrastingTextColor(brandColor);

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 52%, ${brandColor}bb 100%)`,
      }}
    >
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
          <div
            className="px-6 py-8 text-center sm:px-8 sm:py-12"
            style={{ backgroundColor: getLighterShade(brandColor, 0.08) }}
          >
            <div className="mx-auto mb-6">
              <BrandedLogo
                logoUrl={logoUrl ?? null}
                agencyName={agencyName}
                brandColor={brandColor}
                variant="hero"
              />
            </div>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>

            <div className="mt-5 space-y-3">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
              <div
                className="mx-auto h-0.5 w-12 rounded-full"
                style={{ backgroundColor: getLighterShade(brandColor, 0.3) }}
              />
              <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                {description}
              </p>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <div className="space-y-6">
              {summaryItems.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {summaryItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground sm:text-base">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {primaryAction || secondaryAction ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  {primaryAction ? (
                    <ActionButton action={primaryAction} brandColor={brandColor} />
                  ) : null}
                  {secondaryAction ? (
                    <ActionButton action={secondaryAction} brandColor={brandColor} />
                  ) : null}
                </div>
              ) : null}

              {children ? <div className="border-t border-border/60 pt-6">{children}</div> : null}
            </div>
          </div>

          <div
            className="px-6 py-4 sm:px-8"
            style={{ backgroundColor: getLighterShade(brandColor, 0.05) }}
          >
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-2">
                <BrandedLogo
                  logoUrl={logoUrl ?? null}
                  agencyName={agencyName}
                  brandColor={brandColor}
                  variant="footer"
                  className="mx-0"
                />
                <span className="text-sm font-medium text-foreground">{agencyName}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} {agencyName}. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {showPoweredBy ? (
          <div className="mt-6 text-center">
            <Link
              href="https://www.goodaba.com"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ color: brandColor }}
            >
              Powered by GoodABA
            </Link>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <Link
              href="https://www.goodaba.com"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-medium backdrop-blur-xs transition-colors hover:bg-white/30"
              style={{ color: contrastColor }}
            >
              Powered by GoodABA
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

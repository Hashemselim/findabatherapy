import type { ComponentProps, ReactNode } from "react";
import { CheckCircle2, type LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsList as BaseTabsList, TabsTrigger as BaseTabsTrigger } from "@/components/ui/tabs";
import {
  Table as BaseTable,
  TableBody as BaseTableBody,
  TableCell as BaseTableCell,
  TableHead as BaseTableHead,
  TableHeader as BaseTableHeader,
  TableRow as BaseTableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DashboardTone = "default" | "info" | "success" | "warning" | "danger" | "premium";

const dashboardSurfaceVariants = cva("border shadow-xs", {
  variants: {
    tone: {
      default: "border-border/60 bg-card",
      info: "border-primary/20 bg-primary/5",
      success: "border-emerald-500/20 bg-emerald-500/5",
      warning: "border-amber-500/20 bg-amber-500/5",
      danger: "border-destructive/20 bg-destructive/5",
      premium: "border-primary/20 bg-linear-to-br from-primary/5 via-card to-accent/30",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const dashboardBadgeVariants = cva("border px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      default: "border-border/60 bg-muted/50 text-foreground",
      info: "border-blue-500/20 bg-blue-500/10 text-blue-700",
      success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
      warning: "border-amber-500/20 bg-amber-500/10 text-amber-800",
      danger: "border-destructive/20 bg-destructive/10 text-destructive",
      premium: "border-violet-500/20 bg-violet-500/10 text-violet-700",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const dashboardFilterButtonVariants = cva(
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium leading-none transition-colors",
  {
    variants: {
      active: {
        true: "border-primary bg-primary text-primary-foreground shadow-xs",
        false:
          "border-transparent bg-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/60 hover:text-foreground",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

export function getDashboardToneClasses(tone: DashboardTone) {
  switch (tone) {
    case "info":
      return {
        icon: "bg-primary/10 text-primary",
        mutedIcon: "bg-primary/10 text-primary",
        emphasis: "text-primary",
        subtleText: "text-primary/80",
      };
    case "success":
      return {
        icon: "bg-emerald-500/10 text-emerald-600",
        mutedIcon: "bg-emerald-500/10 text-emerald-600",
        emphasis: "text-emerald-700",
        subtleText: "text-emerald-700/90",
      };
    case "warning":
      return {
        icon: "bg-amber-500/10 text-amber-700",
        mutedIcon: "bg-amber-500/10 text-amber-700",
        emphasis: "text-amber-800",
        subtleText: "text-amber-800/90",
      };
    case "danger":
      return {
        icon: "bg-destructive/10 text-destructive",
        mutedIcon: "bg-destructive/10 text-destructive",
        emphasis: "text-destructive",
        subtleText: "text-destructive/90",
      };
    case "premium":
      return {
        icon: "bg-primary/10 text-primary",
        mutedIcon: "bg-accent text-foreground",
        emphasis: "text-foreground",
        subtleText: "text-muted-foreground",
      };
    case "default":
    default:
      return {
        icon: "bg-muted text-muted-foreground",
        mutedIcon: "bg-muted text-muted-foreground",
        emphasis: "text-foreground",
        subtleText: "text-muted-foreground",
      };
  }
}

interface DashboardCardProps extends ComponentProps<typeof Card>, VariantProps<typeof dashboardSurfaceVariants> {}

export function DashboardCard({ className, tone, ...props }: DashboardCardProps) {
  return <Card className={cn(dashboardSurfaceVariants({ tone }), className)} {...props} />;
}

interface DashboardStatusBadgeProps extends ComponentProps<typeof Badge>, VariantProps<typeof dashboardBadgeVariants> {}

export function DashboardStatusBadge({
  className,
  tone,
  variant = "outline",
  ...props
}: DashboardStatusBadgeProps) {
  return (
    <Badge
      variant={variant}
      className={cn(dashboardBadgeVariants({ tone }), className)}
      {...props}
    />
  );
}

type DashboardFilterGroupProps = ComponentProps<"div">;

export function DashboardFilterGroup({ className, ...props }: DashboardFilterGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex min-h-11 min-w-full flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-card p-1 shadow-xs sm:min-w-0 sm:flex-nowrap",
        className
      )}
      {...props}
    />
  );
}

interface DashboardFilterButtonProps extends ComponentProps<typeof Button> {
  active?: boolean;
  count?: ReactNode;
  icon?: ReactNode;
}

export function DashboardFilterButton({
  active = false,
  count,
  icon,
  className,
  children,
  variant,
  ...props
}: DashboardFilterButtonProps) {
  return (
    <Button
      variant={variant ?? "ghost"}
      className={cn(dashboardFilterButtonVariants({ active }), className)}
      {...props}
    >
      {icon}
      <span>{children}</span>
      {count !== undefined && (
        <span className={cn("tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {count}
        </span>
      )}
    </Button>
  );
}

type DashboardTabsListProps = ComponentProps<typeof BaseTabsList>;

export function DashboardTabsList({ className, ...props }: DashboardTabsListProps) {
  return (
    <BaseTabsList
      className={cn(
        "grid h-auto min-h-11 w-full grid-cols-3 items-stretch rounded-xl border border-border/60 bg-card p-1 shadow-xs group-data-[orientation=horizontal]/tabs:h-auto",
        "sm:inline-flex sm:w-auto sm:min-w-0 sm:flex-nowrap sm:items-center sm:justify-start",
        className
      )}
      {...props}
    />
  );
}

type DashboardTabsTriggerProps = ComponentProps<typeof BaseTabsTrigger>;

export function DashboardTabsTrigger({
  className,
  ...props
}: DashboardTabsTriggerProps) {
  return (
    <BaseTabsTrigger
      className={cn(
        "flex h-auto min-h-9 w-full items-center justify-center rounded-lg border border-transparent px-3 py-2 text-center text-xs font-medium leading-tight",
        "text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs",
        "sm:h-9 sm:w-auto sm:flex-none sm:px-4 sm:py-0 sm:leading-none",
        className
      )}
      {...props}
    />
  );
}

type DashboardTableCardProps = DashboardCardProps;

export function DashboardTableCard({ className, tone, ...props }: DashboardTableCardProps) {
  return <DashboardCard tone={tone} className={cn("overflow-hidden p-0", className)} {...props} />;
}

type DashboardTableProps = ComponentProps<typeof BaseTable>;

export function DashboardTable({ className, ...props }: DashboardTableProps) {
  return <BaseTable className={cn("w-full text-sm", className)} {...props} />;
}

type DashboardTableHeaderProps = ComponentProps<typeof BaseTableHeader>;

export function DashboardTableHeader({ className, ...props }: DashboardTableHeaderProps) {
  return (
    <BaseTableHeader
      className={cn("[&_tr]:border-border/60 [&_tr]:bg-muted/30 hover:[&_tr]:bg-muted/30", className)}
      {...props}
    />
  );
}

type DashboardTableBodyProps = ComponentProps<typeof BaseTableBody>;

export function DashboardTableBody({ className, ...props }: DashboardTableBodyProps) {
  return <BaseTableBody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

type DashboardTableRowProps = ComponentProps<typeof BaseTableRow>;

export function DashboardTableRow({ className, ...props }: DashboardTableRowProps) {
  return <BaseTableRow className={cn("border-border/60 hover:bg-muted/40", className)} {...props} />;
}

type DashboardTableHeadProps = ComponentProps<typeof BaseTableHead>;

export function DashboardTableHead({ className, ...props }: DashboardTableHeadProps) {
  return (
    <BaseTableHead
      className={cn(
        "h-11 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

type DashboardTableCellProps = ComponentProps<typeof BaseTableCell>;

export function DashboardTableCell({ className, ...props }: DashboardTableCellProps) {
  return <BaseTableCell className={cn("px-4 py-3.5 align-middle", className)} {...props} />;
}

interface DashboardCalloutProps extends VariantProps<typeof dashboardSurfaceVariants> {
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function DashboardCallout({
  title,
  description,
  icon: Icon,
  tone = "default",
  action,
  children,
  className,
}: DashboardCalloutProps) {
  const resolvedTone: DashboardTone = tone ?? "default";
  const toneClasses = getDashboardToneClasses(resolvedTone);

  return (
    <DashboardCard tone={resolvedTone} className={className}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneClasses.icon)}>
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <CardTitle className={cn("text-base", toneClasses.emphasis)}>{title}</CardTitle>
            <CardDescription className={cn("mt-1", toneClasses.subtleText)}>{description}</CardDescription>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      {children && <CardContent className="pt-0">{children}</CardContent>}
    </DashboardCard>
  );
}

interface DashboardEmptyStateProps extends VariantProps<typeof dashboardSurfaceVariants> {
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  action?: ReactNode;
  benefits?: string[];
  className?: string;
}

export function DashboardEmptyState({
  title,
  description,
  icon: Icon,
  action,
  benefits = [],
  tone = "default",
  className,
}: DashboardEmptyStateProps) {
  const resolvedTone: DashboardTone = tone ?? "default";
  const toneClasses = getDashboardToneClasses(resolvedTone);

  return (
    <DashboardCard tone={resolvedTone} className={cn("overflow-hidden", className)}>
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl", toneClasses.icon)}>
          <Icon className="h-8 w-8" aria-hidden />
        </div>
        <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">{description}</p>
        {benefits.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {benefits.map((benefit) => (
              <span
                key={benefit}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                {benefit}
              </span>
            ))}
          </div>
        )}
        {action && <div className="mt-8">{action}</div>}
      </CardContent>
    </DashboardCard>
  );
}

interface DashboardFeatureHighlight {
  title: string;
  description: string;
  icon: LucideIcon;
  tone?: DashboardTone;
}

interface DashboardFeatureCardProps extends VariantProps<typeof dashboardSurfaceVariants> {
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  badgeLabel?: string;
  highlights?: DashboardFeatureHighlight[];
  bullets?: string[];
  footer?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function DashboardFeatureCard({
  title,
  description,
  icon: Icon,
  badgeLabel = "Pro",
  highlights = [],
  bullets = [],
  footer,
  action,
  tone = "premium",
  className,
}: DashboardFeatureCardProps) {
  const resolvedTone: DashboardTone = tone ?? "premium";
  const toneClasses = getDashboardToneClasses(resolvedTone);

  return (
    <DashboardCard tone={resolvedTone} className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", toneClasses.icon)}>
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <DashboardStatusBadge tone={resolvedTone}>{badgeLabel}</DashboardStatusBadge>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </div>

          {highlights.length > 0 && (
            <div className={cn("grid gap-3", highlights.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
              {highlights.map((highlight) => {
                const highlightTone = getDashboardToneClasses(highlight.tone ?? "default");
                const HighlightIcon = highlight.icon;

                return (
                  <div
                    key={highlight.title}
                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3"
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", highlightTone.icon)}>
                      <HighlightIcon className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{highlight.title}</p>
                      <p className="text-xs text-muted-foreground">{highlight.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {bullets.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {bullets.map((bullet) => (
                <div key={bullet} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          )}

          {(footer || action) && (
            <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              {footer && <div className="text-sm text-muted-foreground">{footer}</div>}
              {action && <div className="shrink-0">{action}</div>}
            </div>
          )}
        </div>
      </CardContent>
    </DashboardCard>
  );
}

interface DashboardStatCardProps extends VariantProps<typeof dashboardSurfaceVariants> {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  description?: ReactNode;
  trend?: ReactNode;
  className?: string;
}

export function DashboardStatCard({
  label,
  value,
  icon,
  description,
  trend,
  tone = "default",
  className,
}: DashboardStatCardProps) {
  const resolvedTone: DashboardTone = tone ?? "default";
  const toneClasses = getDashboardToneClasses(resolvedTone);

  return (
    <DashboardCard tone={resolvedTone} className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toneClasses.mutedIcon)}>
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-foreground">{value}</span>
          {trend}
        </div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </CardContent>
    </DashboardCard>
  );
}

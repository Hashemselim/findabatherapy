import Link from "next/link";
import { Briefcase, ExternalLink, Heart, LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { brandColors } from "@/config/brands";

interface BrandSectionProps {
  brand: "therapy" | "jobs";
  title: string;
  description: string;
  stats: { label: string; value: number | string; href?: string }[];
  links: { label: string; href: string; icon: LucideIcon; external?: boolean }[];
}

const brandConfig: Record<
  BrandSectionProps["brand"],
  { icon: LucideIcon; color: string; gradient: string }
> = {
  therapy: {
    icon: Heart,
    color: brandColors.therapy,
    gradient: "from-blue-50/80 to-blue-100/40",
  },
  jobs: {
    icon: Briefcase,
    color: brandColors.jobs,
    gradient: "from-emerald-50/80 to-emerald-100/40",
  },
};

export function BrandSection({
  brand,
  title,
  description,
  stats,
  links,
}: BrandSectionProps) {
  const config = brandConfig[brand];
  const Icon = config.icon;

  return (
    <Card className="relative overflow-hidden border-border/60">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`}
      />
      <CardHeader className="relative pb-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${config.color}15` }}
          >
            <Icon className="h-5 w-5" style={{ color: config.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* Stats Row */}
        {stats.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-1.5">
                <span
                  className="text-xl font-semibold"
                  style={{ color: config.color }}
                >
                  {stat.value}
                </span>
                {stat.href ? (
                  <Link
                    href={stat.href}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    {stat.label}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {stat.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="grid gap-2 sm:grid-cols-3">
          {links.map((link) => (
            <Button
              key={link.href}
              asChild
              variant="outline"
              size="sm"
              className="justify-start gap-2"
              style={{
                borderColor: `${config.color}30`,
              }}
            >
              <Link
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
              >
                <link.icon className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{link.label}</span>
                {link.external && (
                  <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground/60" />
                )}
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

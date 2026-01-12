import Link from "next/link";
import { ArrowRight, Briefcase, Heart, LucideIcon, Users } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brandColors } from "@/config/brands";

interface BrandCardProps {
  brand: "therapy" | "jobs" | "crm";
  title: string;
  description: string;
  href: string;
  stats?: { label: string; value: string | number }[];
  isPlaceholder?: boolean;
}

const brandConfig: Record<
  BrandCardProps["brand"],
  { icon: LucideIcon; color: string; gradient: string }
> = {
  therapy: {
    icon: Heart,
    color: brandColors.therapy,
    gradient: "from-blue-50 to-blue-100/50",
  },
  jobs: {
    icon: Briefcase,
    color: brandColors.jobs,
    gradient: "from-emerald-50 to-emerald-100/50",
  },
  crm: {
    icon: Users,
    color: brandColors.crm,
    gradient: "from-purple-50 to-purple-100/50",
  },
};

export function BrandCard({
  brand,
  title,
  description,
  href,
  stats,
  isPlaceholder = false,
}: BrandCardProps) {
  const config = brandConfig[brand];
  const Icon = config.icon;

  if (isPlaceholder) {
    return (
      <Card className="relative overflow-hidden border-border/60">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-50`}
        />
        <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${config.color}15` }}
            >
              <Icon className="h-4 w-4" style={{ color: config.color }} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <Badge
                variant="outline"
                className="mt-0.5 bg-purple-50 text-[10px] text-purple-600"
              >
                Coming Soon
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <p className="mb-4 text-sm text-muted-foreground">{description}</p>
          <Button variant="outline" size="sm" disabled className="w-full">
            Coming Soon
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-border/60 transition-shadow hover:shadow-md">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-30`}
      />
      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <Icon className="h-4 w-4" style={{ color: config.color }} />
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <p className="mb-3 text-sm text-muted-foreground">{description}</p>

        {stats && stats.length > 0 && (
          <div className="mb-4 flex gap-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p
                  className="text-lg font-semibold"
                  style={{ color: config.color }}
                >
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full"
          style={
            {
              "--brand-color": config.color,
              borderColor: `${config.color}40`,
            } as React.CSSProperties
          }
        >
          <Link href={href} className="gap-2">
            Go to {title}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

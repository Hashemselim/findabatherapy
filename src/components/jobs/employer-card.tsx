"use client";

import Link from "next/link";
import { MapPin, Briefcase, BadgeCheck, Building2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { EmployerListItem } from "@/lib/queries/jobs";

interface EmployerCardProps {
  employer: EmployerListItem;
  index?: number;
}

export function EmployerCard({ employer, index }: EmployerCardProps) {
  const initials = employer.agencyName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const location = employer.primaryLocation
    ? `${employer.primaryLocation.city}, ${employer.primaryLocation.state}`
    : null;

  return (
    <Link href={`/employers/${employer.slug}`} className="group block">
      <Card
        className={`h-full border transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] ${
          employer.isVerified
            ? "border-emerald-200 bg-emerald-50/30"
            : "border-border/60 bg-white"
        }`}
        style={
          index !== undefined ? { animationDelay: `${index * 50}ms` } : undefined
        }
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14 border border-border/60 transition-all duration-300 ease-premium group-hover:border-emerald-500/30 group-hover:scale-[1.03]">
              {employer.logoUrl ? (
                <AvatarImage src={employer.logoUrl} alt={employer.agencyName} />
              ) : null}
              <AvatarFallback className="bg-emerald-50 text-sm font-semibold text-emerald-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold transition-colors duration-300 group-hover:text-emerald-700">
                  {employer.agencyName}
                </CardTitle>
                {employer.isVerified && (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                )}
              </div>
              {employer.headline && (
                <CardDescription className="mt-1 line-clamp-2 text-sm">
                  {employer.headline}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
                {employer.locationCount > 1 && (
                  <span className="text-muted-foreground/60">
                    +{employer.locationCount - 1}
                  </span>
                )}
              </span>
            )}
            {employer.openJobCount > 0 ? (
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <Briefcase className="h-3.5 w-3.5" />
                {employer.openJobCount} open{" "}
                {employer.openJobCount === 1 ? "position" : "positions"}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" />
                No open positions
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {employer.openJobCount > 0 && (
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                Hiring
              </Badge>
            )}
            {employer.isVerified && (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700"
              >
                Verified
              </Badge>
            )}
            <Badge variant="outline" className="text-muted-foreground">
              <Building2 className="mr-1 h-3 w-3" />
              ABA Provider
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

import Link from "next/link";
import { ArrowRight, Heart, Briefcase, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OnboardingWelcomePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Welcome to your ABA command center
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Two powerful tools for your agency&apos;s most important functions &mdash; finding clients and finding staff.
        </p>
      </div>

      {/* Two Brand Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Find Clients Card (Blue) */}
        <Card className="border-[#5788FF]/30 bg-gradient-to-br from-[#5788FF]/5 to-[#5788FF]/10">
          <CardContent className="p-4 sm:p-5">
            <Badge variant="outline" className="mb-3 text-[#5788FF] border-[#5788FF]/40 bg-white/50">
              <Heart className="mr-1.5 h-3 w-3" />
              Find Clients
            </Badge>
            <h3 className="text-lg font-semibold mb-1">Find ABA Therapy</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Families search for providers and discover your practice.
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-[#5788FF] flex-shrink-0" />
                <span>Searchable provider profile</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-[#5788FF] flex-shrink-0" />
                <span>Services & insurance info</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-[#5788FF] flex-shrink-0" />
                <span>Inquiry management dashboard</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Find Staff Card (Green) */}
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
          <CardContent className="p-4 sm:p-5">
            <Badge variant="outline" className="mb-3 text-emerald-600 border-emerald-500/40 bg-white/50">
              <Briefcase className="mr-1.5 h-3 w-3" />
              Find Staff
            </Badge>
            <h3 className="text-lg font-semibold mb-1">Find ABA Jobs</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Job seekers find your open positions and apply directly.
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span>Employer profile page</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span>Job postings on job board</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span>Application management</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Bottom CTA */}
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Let&apos;s set up your company profile. This information powers both your client-facing and candidate-facing pages.
        </p>
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/dashboard/onboarding/details">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Briefcase,
  Link2,
  Building2,
  Mail,
  Globe,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CareersPageShareCardProps {
  listingSlug: string;
  companyName: string;
  jobCount: number;
}

export function CareersPageShareCard({
  listingSlug,
  companyName,
  jobCount,
}: CareersPageShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [careersUrl, setCareersUrl] = useState(`/careers/${listingSlug}`);

  // Set full URL after hydration to avoid hydration mismatch
  useEffect(() => {
    setCareersUrl(`${window.location.origin}/careers/${listingSlug}`);
  }, [listingSlug]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(careersUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = careersUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Share Card */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
                <Link2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-foreground">Your Branded Careers Page</CardTitle>
                <CardDescription>
                  A standalone page showcasing all your open positions
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              <Briefcase className="mr-1 h-3 w-3" />
              {jobCount} {jobCount === 1 ? "job" : "jobs"} listed
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Display and Copy */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 rounded-lg border border-emerald-200 bg-white px-4 py-3">
              <p className="truncate font-mono text-sm text-muted-foreground">{careersUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCopyLink}
                className="shrink-0 gap-2"
                variant={copied ? "outline" : "default"}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button asChild variant="outline" className="shrink-0 gap-2">
                <a href={careersUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Preview</span>
                </a>
              </Button>
            </div>
          </div>

          {/* What's included */}
          <div className="rounded-lg border border-emerald-200 bg-white p-4">
            <p className="mb-3 text-sm font-medium text-foreground">What&apos;s on your careers page:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 text-emerald-600" />
                Your company logo and name
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4 text-emerald-600" />
                All your published job listings
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-emerald-600" />
                Direct application forms
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4 text-emerald-600" />
                Link to your company website
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Use Cases Card */}
      <Card className="border-border/60 bg-white">
        <CardHeader>
          <CardTitle className="text-foreground">Ways to Use Your Careers Page</CardTitle>
          <CardDescription>
            Share this link anywhere you want to attract qualified candidates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-medium text-foreground">Company Website</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Add to your &quot;Careers&quot; or &quot;Join Our Team&quot; page
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-medium text-foreground">Job Board Posts</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Include in your Indeed, LinkedIn, or ZipRecruiter listings
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-medium text-foreground">Employee Referrals</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Share with staff to pass along to potential candidates
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-medium text-foreground">Email Signature</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Add &quot;We&apos;re hiring!&quot; link to team email signatures
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card className="border-border/60 bg-white">
        <CardHeader>
          <CardTitle className="text-foreground">Page Preview</CardTitle>
          <CardDescription>
            This is how your careers page appears to job seekers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-slate-50 to-white p-6">
            <div className="mx-auto max-w-md space-y-4">
              {/* Mock Header */}
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-emerald-700">
                    {companyName.split(" ").map(w => w[0]).slice(0, 2).join("")}
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold text-foreground">Careers at {companyName}</p>
                <p className="text-sm text-muted-foreground">We&apos;re hiring!</p>
              </div>

              {/* Mock Job Cards */}
              <div className="space-y-2">
                {[1, 2, 3].slice(0, Math.min(jobCount, 3) || 1).map((i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/60 bg-white p-3"
                  >
                    <div className="h-3 w-32 rounded bg-muted" />
                    <div className="mt-2 flex gap-2">
                      <div className="h-2 w-16 rounded bg-muted/70" />
                      <div className="h-2 w-12 rounded bg-muted/70" />
                    </div>
                  </div>
                ))}
              </div>

              {jobCount === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  No jobs posted yet. <Link href="/dashboard/jobs/new" className="text-emerald-600 hover:underline">Create your first job</Link> to see it here.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <Button asChild variant="outline" size="sm">
              <a href={careersUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View Full Page
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* No Jobs CTA */}
      {jobCount === 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-foreground">No jobs to display yet</p>
                <p className="text-sm text-muted-foreground">
                  Create a job posting to start showing positions on your careers page.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href="/dashboard/jobs/new">
                Create Job
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

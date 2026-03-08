"use client";

import { useState, useEffect } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Globe,
  Mail,
  MessageSquare,
  Share2,
} from "lucide-react";

import { DashboardCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProviderContactPath } from "@/lib/utils/public-paths";

interface IntakeFormShareCardProps {
  listingSlug: string;
}

export function IntakeFormShareCard({
  listingSlug,
}: IntakeFormShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [contactUrl, setContactUrl] = useState(
    getProviderContactPath(listingSlug)
  );

  // Set full URL after hydration to avoid hydration mismatch
  useEffect(() => {
    setContactUrl(
      `${window.location.origin}${getProviderContactPath(listingSlug)}`
    );
  }, [listingSlug]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(contactUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = contactUrl;
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
      <DashboardCard tone="info" className="bg-linear-to-br from-primary/5 via-card to-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Link2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-foreground">Your Branded Intake Form</CardTitle>
                <CardDescription>
                  A standalone form for families to contact you directly
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Display and Copy */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-xs">
              <p className="truncate font-mono text-sm text-muted-foreground">{contactUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCopyLink}
                className="shrink-0 gap-2"
                variant={copied ? "outline-solid" : "default"}
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
                <a href={contactUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Preview</span>
                </a>
              </Button>
            </div>
          </div>

          {/* What's included */}
          <div className="rounded-lg border border-border/60 bg-card p-4 shadow-xs">
            <p className="mb-3 text-sm font-medium text-foreground">How it works:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4 text-primary" />
                Family fills out contact form
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                You get email notification
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4 text-primary" />
                Message appears in your Inbox
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Share2 className="h-4 w-4 text-primary" />
                Share anywhere you want
              </div>
            </div>
          </div>
        </CardContent>
      </DashboardCard>

      {/* Use Cases Card */}
      <DashboardCard>
        <CardHeader>
          <CardTitle className="text-foreground">Ways to Use Your Intake Form</CardTitle>
          <CardDescription>
            Share this link anywhere you want to capture leads from families
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Company Website</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Link from your &quot;Contact Us&quot; button
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Email Signature</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Add to your team&apos;s email signatures
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Social Media</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Post on Facebook, Instagram, or LinkedIn
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Direct Sharing</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Share via text or email with families
              </p>
            </div>
          </div>
        </CardContent>
      </DashboardCard>
    </div>
  );
}

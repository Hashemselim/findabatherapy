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

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface IntakeFormShareCardProps {
  listingSlug: string;
}

export function IntakeFormShareCard({
  listingSlug,
}: IntakeFormShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [intakeUrl, setIntakeUrl] = useState(`/intake/${listingSlug}`);

  // Set full URL after hydration to avoid hydration mismatch
  useEffect(() => {
    setIntakeUrl(`${window.location.origin}/intake/${listingSlug}`);
  }, [listingSlug]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(intakeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = intakeUrl;
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
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-white">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5788FF]">
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
            <div className="flex-1 rounded-lg border border-blue-200 bg-white px-4 py-3">
              <p className="truncate font-mono text-sm text-muted-foreground">{intakeUrl}</p>
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
                <a href={intakeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Preview</span>
                </a>
              </Button>
            </div>
          </div>

          {/* What's included */}
          <div className="rounded-lg border border-blue-200 bg-white p-4">
            <p className="mb-3 text-sm font-medium text-foreground">How it works:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4 text-[#5788FF]" />
                Family fills out contact form
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-[#5788FF]" />
                You get email notification
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4 text-[#5788FF]" />
                Message appears in your Inbox
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Share2 className="h-4 w-4 text-[#5788FF]" />
                Share anywhere you want
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Use Cases Card */}
      <Card className="border-border/60 bg-white">
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
                <Globe className="h-4 w-4 text-[#5788FF]" />
                <p className="text-sm font-medium text-foreground">Company Website</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Link from your &quot;Contact Us&quot; button
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#5788FF]" />
                <p className="text-sm font-medium text-foreground">Email Signature</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Add to your team&apos;s email signatures
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Share2 className="h-4 w-4 text-[#5788FF]" />
                <p className="text-sm font-medium text-foreground">Social Media</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Post on Facebook, Instagram, or LinkedIn
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#5788FF]" />
                <p className="text-sm font-medium text-foreground">Direct Sharing</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Share via text or email with families
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

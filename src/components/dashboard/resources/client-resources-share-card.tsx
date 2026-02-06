"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check, Copy, ExternalLink, GraduationCap, Link2, Search, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ClientResourcesShareCardProps {
  listingSlug: string;
}

export function ClientResourcesShareCard({ listingSlug }: ClientResourcesShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [resourcesUrl, setResourcesUrl] = useState(`/resources/${listingSlug}`);

  useEffect(() => {
    setResourcesUrl(`${window.location.origin}/resources/${listingSlug}`);
  }, [listingSlug]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(resourcesUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = resourcesUrl;
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
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-white">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5788FF]">
                <Link2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-foreground">Your Branded Parent Resources Page</CardTitle>
                <CardDescription>
                  Share FAQ, glossary terms, and featured guides with families
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 rounded-lg border border-blue-200 bg-white px-4 py-3">
              <p className="truncate font-mono text-sm text-muted-foreground">{resourcesUrl}</p>
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
                <a href={resourcesUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Preview</span>
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-white p-4">
            <p className="mb-3 text-sm font-medium text-foreground">What families can use on this page:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4 text-[#5788FF]" />
                Searchable ABA FAQ
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4 text-[#5788FF]" />
                Glossary of ABA terms
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4 text-[#5788FF]" />
                Featured education guides
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Share2 className="h-4 w-4 text-[#5788FF]" />
                Easy section toggles for readability
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-white">
        <CardHeader>
          <CardTitle className="text-foreground">Ways to Use This Page</CardTitle>
          <CardDescription>
            Send this link as a value-add before or during intake conversations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">After initial inquiry</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Send families educational context before the first call.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">In your email signature</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add as a parent education link for ongoing referrals.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">On your website</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Link from a “Parent Resources” section to reduce repetitive questions.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">With referrals</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Share with pediatricians, schools, and partner organizations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  ClipboardList,
  Users,
  FileText,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { updateClientIntakeEnabled } from "@/lib/actions/listings";

interface ClientIntakeShareCardProps {
  listingSlug: string;
  isEnabled: boolean;
}

export function ClientIntakeShareCard({
  listingSlug,
  isEnabled: initialIsEnabled,
}: ClientIntakeShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [intakeUrl, setIntakeUrl] = useState(`/intake/${listingSlug}/client`);
  const [isEnabled, setIsEnabled] = useState(initialIsEnabled);
  const [isPending, startTransition] = useTransition();

  // Set full URL after hydration to avoid hydration mismatch
  useEffect(() => {
    setIntakeUrl(`${window.location.origin}/intake/${listingSlug}/client`);
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

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
    startTransition(async () => {
      const result = await updateClientIntakeEnabled(checked);
      if (!result.success) {
        // Revert on error
        setIsEnabled(!checked);
      }
    });
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-white">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-foreground">Client Intake Form</CardTitle>
              <CardDescription>
                A comprehensive form for new client onboarding
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="client-intake-enabled"
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={isPending}
            />
            <Label htmlFor="client-intake-enabled" className="text-sm font-medium">
              {isEnabled ? "Enabled" : "Disabled"}
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEnabled ? (
          <>
            {/* URL Display and Copy */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 rounded-lg border border-purple-200 bg-white px-4 py-3">
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
            <div className="rounded-lg border border-purple-200 bg-white p-4">
              <p className="mb-3 text-sm font-medium text-foreground">What families can submit:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-purple-600" />
                  Parent/guardian information
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Child details & diagnosis
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Insurance information
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClipboardList className="h-4 w-4 text-purple-600" />
                  Goes directly to Clients
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Enable this form to share a comprehensive intake link with families.
              Submissions will appear directly in your Clients list.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

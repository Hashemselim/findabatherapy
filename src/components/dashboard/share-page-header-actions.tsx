"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SharePageHeaderActionsProps {
  relativePath: string;
  copyLabel?: string;
  previewLabel?: string;
}

export function SharePageHeaderActions({
  relativePath,
  copyLabel = "Copy Link",
  previewLabel = "Preview",
}: SharePageHeaderActionsProps) {
  const [copied, setCopied] = useState(false);
  const [fullUrl, setFullUrl] = useState(relativePath);

  useEffect(() => {
    setFullUrl(`${window.location.origin}${relativePath}`);
  }, [relativePath]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = fullUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <Button
        size="sm"
        onClick={handleCopy}
        className="w-full gap-2 sm:w-auto"
        variant={copied ? "outline-solid" : "default"}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied!" : copyLabel}
      </Button>
      <Button asChild size="sm" variant="outline" className="w-full gap-2 sm:w-auto">
        <a href={fullUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          {previewLabel}
        </a>
      </Button>
    </>
  );
}

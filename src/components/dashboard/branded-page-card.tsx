"use client";

import { useEffect, useState } from "react";
import { BookOpen, Briefcase, Check, ClipboardList, Copy, ExternalLink, Globe, LayoutTemplate, MessageSquare } from "lucide-react";

import { DashboardCard, type DashboardTone } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type BrandedPageIconName = "contact" | "intake" | "resources" | "careers" | "agency" | "website";

interface BrandedPageCardProps {
  title: string;
  sentence: string;
  relativePath: string;
  iconName: BrandedPageIconName;
  howItWorks: string[];
  showActions?: boolean;
  /** When true, "How it works" renders as a static list instead of an accordion */
  defaultExpanded?: boolean;
}

const variantMap = {
  contact: {
    Icon: MessageSquare,
    tone: "info",
  },
  intake: {
    Icon: ClipboardList,
    tone: "premium",
  },
  resources: {
    Icon: BookOpen,
    tone: "info",
  },
  careers: {
    Icon: Briefcase,
    tone: "success",
  },
  agency: {
    Icon: Globe,
    tone: "warning",
  },
  website: {
    Icon: LayoutTemplate,
    tone: "info",
  },
} as const satisfies Record<BrandedPageIconName, { Icon: typeof MessageSquare; tone: DashboardTone }>;

export function BrandedPageCard({
  title,
  sentence,
  relativePath,
  iconName,
  howItWorks,
  showActions = true,
  defaultExpanded,
}: BrandedPageCardProps) {
  const variant = variantMap[iconName];
  const Icon = variant.Icon;
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
    <DashboardCard tone={variant.tone} className="overflow-hidden border-l-4 p-4 sm:p-5">
        <CardHeader className="space-y-2.5 p-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <CardTitle className="text-lg leading-tight sm:text-xl">{title}</CardTitle>
                <p className="text-sm font-medium leading-snug text-foreground">{sentence}</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3.5 p-0 pt-3.5">
          <div className="flex flex-col gap-2 rounded-md border border-border/70 bg-white px-3 py-2 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{fullUrl}</p>
            {showActions && (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCopy} className="gap-1.5" variant={copied ? "outline-solid" : "default"}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Preview
                  </a>
                </Button>
              </div>
            )}
          </div>

          {defaultExpanded ? (
            <div className="rounded-md border border-border/70 bg-white px-3 py-3">
              <p className="text-sm font-semibold text-foreground">How it works</p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                {howItWorks.map((step) => (
                  <li key={step} className="flex items-start gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Accordion type="single" collapsible className="rounded-md border border-border/70 bg-white px-3">
              <AccordionItem value="how-it-works" className="border-b-0">
                <AccordionTrigger className="py-3 text-sm font-semibold text-foreground hover:no-underline">
                  How it works
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1.5 pb-1 text-sm leading-relaxed text-muted-foreground">
                    {howItWorks.map((step) => (
                      <li key={step} className="flex items-start gap-2">
                        <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </CardContent>
    </DashboardCard>
  );
}

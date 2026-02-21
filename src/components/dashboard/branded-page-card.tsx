"use client";

import { useEffect, useState } from "react";
import { BookOpen, Briefcase, Check, ClipboardList, Copy, ExternalLink, Globe, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type BrandedPageIconName = "contact" | "intake" | "resources" | "careers" | "agency";

interface BrandedPageCardProps {
  title: string;
  sentence: string;
  relativePath: string;
  iconName: BrandedPageIconName;
  howItWorks: string[];
}

const variantMap = {
  contact: {
    Icon: MessageSquare,
    border: "border-l-[#2B6FE8]",
    tint: "bg-[#2B6FE8]/8",
    iconBg: "bg-[#2B6FE8]",
    iconFg: "text-white",
    accentText: "text-[#1E4FA3]",
  },
  intake: {
    Icon: ClipboardList,
    border: "border-l-[#6D28D9]",
    tint: "bg-[#6D28D9]/8",
    iconBg: "bg-[#6D28D9]",
    iconFg: "text-white",
    accentText: "text-[#5B21B6]",
  },
  resources: {
    Icon: BookOpen,
    border: "border-l-[#0E7490]",
    tint: "bg-[#0E7490]/8",
    iconBg: "bg-[#0E7490]",
    iconFg: "text-white",
    accentText: "text-[#0F5F73]",
  },
  careers: {
    Icon: Briefcase,
    border: "border-l-[#15803D]",
    tint: "bg-[#15803D]/8",
    iconBg: "bg-[#15803D]",
    iconFg: "text-white",
    accentText: "text-[#166534]",
  },
  agency: {
    Icon: Globe,
    border: "border-l-[#E85D2B]",
    tint: "bg-[#E85D2B]/8",
    iconBg: "bg-[#E85D2B]",
    iconFg: "text-white",
    accentText: "text-[#B84A22]",
  },
} as const;

export function BrandedPageCard({
  title,
  sentence,
  relativePath,
  iconName,
  howItWorks,
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
    <Card className={`overflow-hidden border border-border/70 border-l-4 shadow-sm ${variant.border}`}>
      <div className={`p-4 sm:p-5 ${variant.tint}`}>
        <CardHeader className="space-y-2.5 p-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${variant.iconBg} ${variant.iconFg}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <CardTitle className="text-lg leading-tight sm:text-xl">{title}</CardTitle>
                <p className={`text-sm font-medium leading-snug ${variant.accentText}`}>{sentence}</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3.5 p-0 pt-3.5">
          <div className="flex flex-col gap-2 rounded-md border border-border/70 bg-white px-3 py-2 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{fullUrl}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCopy} className="gap-1.5" variant={copied ? "outline" : "default"}>
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
          </div>

          <Accordion type="single" collapsible className="rounded-md border border-border/70 bg-white px-3">
            <AccordionItem value="how-it-works" className="border-b-0">
              <AccordionTrigger className="py-3 text-sm font-semibold text-foreground hover:no-underline">
                How it works
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1.5 pb-1 text-sm leading-relaxed text-muted-foreground">
                  {howItWorks.map((step) => (
                    <li key={step} className="flex items-start gap-2">
                      <span className={`mt-[6px] h-1.5 w-1.5 rounded-full ${variant.iconBg}`} aria-hidden />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </div>
    </Card>
  );
}

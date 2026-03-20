"use client";

import { useState } from "react";
import { Check, Globe, Mail, MailQuestion, Phone, AlertTriangle } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const iconClass = "h-3.5 w-3.5";

interface ChannelIconsProps {
  contactability: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  contactFormUrl?: string | null;
  className?: string;
}

type ChannelAction =
  | { type: "copy"; value: string; label: string }
  | { type: "link"; href: string; label: string };

interface ChannelItem {
  icon: React.ReactNode;
  action: ChannelAction;
}

function CopyableIcon({ icon, action }: { icon: React.ReactNode; action: ChannelAction }) {
  const [copied, setCopied] = useState(false);

  if (action.type === "link") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={action.href}
            target="_blank"
            rel="noreferrer"
            className="rounded p-0.5 text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950 dark:hover:text-emerald-300"
            onClick={(e) => e.stopPropagation()}
          >
            {icon}
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">{action.label}</TooltipContent>
      </Tooltip>
    );
  }

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (action.type !== "copy") return;
    navigator.clipboard.writeText(action.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Tooltip open={copied ? true : undefined}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded p-0.5 transition-colors",
            copied
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950 dark:hover:text-emerald-300"
          )}
          onClick={handleCopy}
        >
          {copied ? <Check className={iconClass} /> : icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {copied ? "Copied!" : action.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function ReferralContactChannelIcons({
  contactability,
  email,
  phone,
  website,
  contactFormUrl,
  className,
}: ChannelIconsProps) {
  const channels: (ChannelItem | null)[] = [
    email ? { icon: <Mail className={iconClass} />, action: { type: "copy", value: email, label: email } } : null,
    phone ? { icon: <Phone className={iconClass} />, action: { type: "copy", value: phone, label: phone } } : null,
    website ? { icon: <Globe className={iconClass} />, action: { type: "link", href: website, label: "Visit website" } } : null,
    contactFormUrl ? { icon: <MailQuestion className={iconClass} />, action: { type: "link", href: contactFormUrl, label: "Contact form" } } : null,
  ];

  const activeChannels = channels.filter((c): c is ChannelItem => c !== null);

  if (contactability === "no_channel_found" && activeChannels.length === 0) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex text-muted-foreground/40", className)}>
              <AlertTriangle className={iconClass} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">No contact channels found</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex items-center gap-1.5", className)}>
        {activeChannels.map((item, idx) => (
          <CopyableIcon key={idx} icon={item.icon} action={item.action} />
        ))}
      </div>
    </TooltipProvider>
  );
}

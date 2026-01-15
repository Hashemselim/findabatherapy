"use client";

import { Phone, Mail, Copy, Check, StickyNote } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ClientQuickActionsProps {
  phone?: string | null;
  email?: string | null;
  onAddNote?: () => void;
  className?: string;
  size?: "sm" | "default";
}

export function ClientQuickActions({
  phone,
  email,
  onAddNote,
  className,
  size = "sm",
}: ClientQuickActionsProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyPhone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    await navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!email) return;
    await navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const buttonSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1", className)}>
        {phone && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={buttonSize}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `tel:${phone}`;
                  }}
                >
                  <Phone className={iconSize} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Call {phone}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={buttonSize}
                  onClick={handleCopyPhone}
                >
                  {copiedPhone ? (
                    <Check className={cn(iconSize, "text-green-500")} />
                  ) : (
                    <Copy className={iconSize} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copiedPhone ? "Copied!" : "Copy phone"}</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {email && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={buttonSize}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `mailto:${email}`;
                  }}
                >
                  <Mail className={iconSize} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Email {email}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={buttonSize}
                  onClick={handleCopyEmail}
                >
                  {copiedEmail ? (
                    <Check className={cn(iconSize, "text-green-500")} />
                  ) : (
                    <Copy className={iconSize} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copiedEmail ? "Copied!" : "Copy email"}</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {onAddNote && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={buttonSize}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNote();
                }}
              >
                <StickyNote className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add note</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Mail,
  Phone,
  Clock,
  User,
  MapPin,
  Reply,
  Archive,
  Loader2,
  Copy,
  Check,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Inquiry } from "@/lib/actions/inquiries";

interface InboxMessageDetailProps {
  inquiry: Inquiry | null;
  onMarkAsReplied?: (inquiryId: string) => Promise<void>;
  onArchive?: (inquiryId: string) => Promise<void>;
  isLoading?: boolean;
  /** If true, actions show a demo toast instead of performing real actions */
  isDemo?: boolean;
  onDemoAction?: () => void;
  /** Callback to go back to list view (mobile) */
  onBack?: () => void;
  /** Show back button (mobile) */
  showBackButton?: boolean;
}

function getLocationDisplayName(inquiry: Inquiry): string | null {
  if (!inquiry.location) return null;
  return inquiry.location.label || `${inquiry.location.city}, ${inquiry.location.state}`;
}

export function InboxMessageDetail({
  inquiry,
  onMarkAsReplied,
  onArchive,
  isLoading = false,
  isDemo = false,
  onDemoAction,
  onBack,
  showBackButton = false,
}: InboxMessageDetailProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleReplyViaEmail = (email: string, name: string, client: "gmail" | "outlook" | "yahoo") => {
    if (isDemo && onDemoAction) {
      onDemoAction();
      return;
    }

    const subject = encodeURIComponent(`Re: Your inquiry on FindABATherapy`);
    const body = encodeURIComponent(`Hi ${name.split(" ")[0]},\n\nThank you for reaching out!\n\n`);

    const urls = {
      gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`,
      outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${email}&subject=${subject}&body=${body}`,
      yahoo: `https://compose.mail.yahoo.com/?to=${email}&subject=${subject}&body=${body}`,
    };

    window.open(urls[client], "_blank");
  };

  const handleCopyEmail = async (email: string) => {
    if (isDemo && onDemoAction) {
      onDemoAction();
      return;
    }

    await navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleMarkAsReplied = async () => {
    if (isDemo && onDemoAction) {
      onDemoAction();
      return;
    }
    if (inquiry && onMarkAsReplied) {
      await onMarkAsReplied(inquiry.id);
    }
  };

  const handleArchive = async () => {
    if (isDemo && onDemoAction) {
      onDemoAction();
      return;
    }
    if (inquiry && onArchive) {
      await onArchive(inquiry.id);
    }
  };

  if (!inquiry) {
    return (
      <Card className="flex min-h-0 flex-1 items-center justify-center border-border/60">
        <CardContent className="py-12 text-center">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Select a message to view details
          </p>
        </CardContent>
      </Card>
    );
  }

  const locationName = getLocationDisplayName(inquiry);

  return (
    <Card className="flex min-h-0 flex-1 flex-col border-border/60">
      <CardHeader className="shrink-0">
        {/* Back button for mobile */}
        {showBackButton && onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="-ml-2 mb-2 w-fit gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to messages
          </Button>
        )}
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{inquiry.familyName}</CardTitle>
            <CardDescription>{inquiry.familyEmail}</CardDescription>
          </div>
          <Badge
            variant={
              inquiry.status === "unread"
                ? "default"
                : inquiry.status === "replied"
                  ? "secondary"
                  : "outline"
            }
          >
            {inquiry.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-6 overflow-y-auto">
        {/* Contact Info */}
        <div className="grid gap-4 sm:grid-cols-3">
          {inquiry.familyPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a
                href={`tel:${inquiry.familyPhone}`}
                className="text-sm text-[#5788FF] hover:underline"
              >
                {inquiry.familyPhone}
              </a>
            </div>
          )}
          {inquiry.childAge && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Child age: {inquiry.childAge}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {formatDistanceToNow(new Date(inquiry.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>

        {/* Location */}
        {locationName && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <MapPin className="h-4 w-4 text-[#5788FF]" />
            <span className="text-sm">
              Inquiring about: <strong>{locationName}</strong>
            </span>
          </div>
        )}

        {/* Message */}
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Message</p>
          <div className="rounded-lg bg-muted/30 p-4">
            <p className="whitespace-pre-wrap text-foreground">{inquiry.message}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Reply className="mr-2 h-4 w-4" />
                Reply via Email
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => handleReplyViaEmail(inquiry.familyEmail, inquiry.familyName, "gmail")}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                </svg>
                Gmail
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleReplyViaEmail(inquiry.familyEmail, inquiry.familyName, "outlook")}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.154-.352.23-.58.23h-8.547v-6.959l1.6 1.229c.1.086.215.129.346.129.14 0 .26-.05.363-.148l.796-.697a.478.478 0 0 0 .168-.377.478.478 0 0 0-.168-.377l-5.106-4.322a.478.478 0 0 0-.377-.148.478.478 0 0 0-.377.148L6.773 11.47a.478.478 0 0 0-.168.377c0 .148.056.274.168.377l.796.697a.478.478 0 0 0 .363.148.478.478 0 0 0 .346-.129l1.6-1.229v6.96H.818a.788.788 0 0 1-.58-.23A.788.788 0 0 1 0 17.865V7.387l9.818 7.628c.334.26.717.39 1.15.39.432 0 .815-.13 1.15-.39L24 7.387zM23.762 5.33a.764.764 0 0 1 .238.568v.126l-11.58 9.044a.478.478 0 0 1-.377.148.478.478 0 0 1-.377-.148L.42 5.83v-.126c0-.216.08-.407.238-.568A.788.788 0 0 1 1.238 5h21.524c.228 0 .422.077.58.23.158.154.238.346.238.568v.532z" />
                </svg>
                Outlook
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleReplyViaEmail(inquiry.familyEmail, inquiry.familyName, "yahoo")}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.996 18.326l-.396.024V24l.396.025C17.064 23.49 20 20.121 20 16V8.5l-.396-.025C15.68 8.995 12.996 11.879 12.996 15.5v2.826zM11 24v-5.674l.396-.024c0-3.621-2.684-6.505-6.608-7.025L4.393 11.3V16c0 4.121 2.936 7.49 6.607 8z" />
                </svg>
                Yahoo Mail
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopyEmail(inquiry.familyEmail)}>
                {copiedEmail ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copiedEmail ? "Copied!" : "Copy Email Address"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {inquiry.status !== "replied" && (
            <Button variant="outline" onClick={handleMarkAsReplied} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Reply className="mr-2 h-4 w-4" />
              )}
              Mark as Replied
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive Inquiry</AlertDialogTitle>
                <AlertDialogDescription>
                  This will move the inquiry to your archive. You can&apos;t undo this action.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

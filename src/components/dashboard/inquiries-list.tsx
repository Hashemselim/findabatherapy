"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Mail,
  MailOpen,
  Reply,
  Archive,
  Phone,
  Calendar,
  Loader2,
  ExternalLink,
  ChevronRight,
  MapPin,
  Copy,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnalyticsLocationFilter, type LocationOption } from "@/components/dashboard/analytics-location-filter";
import {
  type Inquiry,
  markInquiryAsRead,
  markInquiryAsReplied,
  archiveInquiry,
} from "@/lib/actions/inquiries";
import type { InquiryStatus } from "@/lib/validations/contact";

interface InquiriesListProps {
  initialInquiries: Inquiry[];
  initialUnreadCount: number;
  locations: LocationOption[];
}

const statusConfig: Record<
  InquiryStatus,
  { label: string; variant: "default" | "secondary" | "outline"; icon: typeof Mail }
> = {
  unread: { label: "New", variant: "default", icon: Mail },
  read: { label: "Read", variant: "secondary", icon: MailOpen },
  replied: { label: "Replied", variant: "outline", icon: Reply },
  archived: { label: "Archived", variant: "outline", icon: Archive },
};

export function InquiriesList({ initialInquiries, initialUnreadCount, locations }: InquiriesListProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "all">("all");
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(locations.map((l) => l.id));
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleReplyViaEmail = (email: string, name: string, client: "gmail" | "outlook" | "yahoo") => {
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
    await navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Helper to get location display name
  const getLocationDisplayName = (inquiry: Inquiry): string | null => {
    if (!inquiry.location) return null;
    return inquiry.location.label || `${inquiry.location.city}, ${inquiry.location.state}`;
  };

  const handleViewInquiry = async (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);

    // Mark as read if unread
    if (inquiry.status === "unread") {
      const result = await markInquiryAsRead(inquiry.id);
      if (result.success) {
        setInquiries((prev) =>
          prev.map((i) =>
            i.id === inquiry.id ? { ...i, status: "read" as InquiryStatus, readAt: new Date().toISOString() } : i
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setSelectedInquiry((prev) =>
          prev ? { ...prev, status: "read" as InquiryStatus, readAt: new Date().toISOString() } : null
        );
      }
    }
  };

  const handleMarkAsReplied = async (inquiryId: string) => {
    setIsLoading(inquiryId);
    const result = await markInquiryAsReplied(inquiryId);
    if (result.success) {
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === inquiryId ? { ...i, status: "replied" as InquiryStatus, repliedAt: new Date().toISOString() } : i
        )
      );
      setSelectedInquiry((prev) =>
        prev?.id === inquiryId ? { ...prev, status: "replied" as InquiryStatus, repliedAt: new Date().toISOString() } : prev
      );
    }
    setIsLoading(null);
  };

  const handleArchive = async (inquiryId: string) => {
    setIsLoading(inquiryId);
    const result = await archiveInquiry(inquiryId);
    if (result.success) {
      setInquiries((prev) => prev.filter((i) => i.id !== inquiryId));
      setSelectedInquiry(null);
    }
    setIsLoading(null);
  };

  // Filter by status
  let filteredInquiries = statusFilter === "all"
    ? inquiries
    : inquiries.filter((i) => i.status === statusFilter);

  // Filter by location (include inquiries with no location or matching selected locations)
  const allLocationsSelected = selectedLocationIds.length === locations.length;
  if (!allLocationsSelected && selectedLocationIds.length > 0) {
    filteredInquiries = filteredInquiries.filter((i) =>
      i.locationId === null || selectedLocationIds.includes(i.locationId)
    );
  } else if (selectedLocationIds.length === 0) {
    // If no locations selected, show all inquiries (same behavior as analytics)
    // This is the "none selected = all selected" pattern
  }

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="min-h-[44px] sm:min-h-0"
          >
            All ({inquiries.length})
          </Button>
          <Button
            variant={statusFilter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("unread")}
            className="min-h-[44px] sm:min-h-0"
          >
            <Mail className="mr-1 h-4 w-4" />
            New ({unreadCount})
          </Button>
          <Button
            variant={statusFilter === "read" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("read")}
            className="min-h-[44px] sm:min-h-0"
          >
            <MailOpen className="mr-1 h-4 w-4" />
            Read
          </Button>
          <Button
            variant={statusFilter === "replied" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("replied")}
            className="min-h-[44px] sm:min-h-0"
          >
            <Reply className="mr-1 h-4 w-4" />
            Replied
          </Button>
        </div>

        {/* Location Filter */}
        {locations.length > 1 && (
          <AnalyticsLocationFilter
            locations={locations}
            selectedIds={selectedLocationIds}
            onChange={setSelectedLocationIds}
          />
        )}
      </div>

      {/* Inquiries List */}
      {filteredInquiries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground">No inquiries found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter === "all" && allLocationsSelected
                ? "When families contact you, their messages will appear here."
                : "No inquiries match your current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInquiries.map((inquiry) => {
            const config = statusConfig[inquiry.status];
            const StatusIcon = config.icon;
            const locationName = getLocationDisplayName(inquiry);

            return (
              <Card
                key={inquiry.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  inquiry.status === "unread" ? "border-primary/50 bg-primary/5" : ""
                }`}
                onClick={() => handleViewInquiry(inquiry)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                    <StatusIcon className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {inquiry.familyName}
                      </span>
                      <Badge variant={config.variant} className="text-xs">
                        {config.label}
                      </Badge>
                      {locationName && (
                        <Badge variant="outline" className="gap-1 text-xs font-normal text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {locationName}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {inquiry.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(inquiry.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Inquiry Detail Dialog */}
      <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
        {selectedInquiry && (
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {selectedInquiry.familyName}
                <Badge variant={statusConfig[selectedInquiry.status].variant}>
                  {statusConfig[selectedInquiry.status].label}
                </Badge>
                {getLocationDisplayName(selectedInquiry) && (
                  <Badge variant="outline" className="gap-1 text-xs font-normal text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {getLocationDisplayName(selectedInquiry)}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Received {formatDistanceToNow(new Date(selectedInquiry.createdAt), { addSuffix: true })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Contact Info */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${selectedInquiry.familyEmail}`}
                      className="text-[#5788FF] hover:underline"
                    >
                      {selectedInquiry.familyEmail}
                    </a>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                  {selectedInquiry.familyPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`tel:${selectedInquiry.familyPhone}`}
                        className="text-[#5788FF] hover:underline"
                      >
                        {selectedInquiry.familyPhone}
                      </a>
                    </div>
                  )}
                  {selectedInquiry.childAge && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Child&apos;s age: {selectedInquiry.childAge}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <h4 className="mb-2 text-sm font-medium text-foreground">Message</h4>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {selectedInquiry.message}
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              {selectedInquiry.status !== "replied" && (
                <Button
                  variant="outline"
                  onClick={() => handleMarkAsReplied(selectedInquiry.id)}
                  disabled={isLoading === selectedInquiry.id}
                >
                  {isLoading === selectedInquiry.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Reply className="mr-2 h-4 w-4" />
                  )}
                  Mark as Replied
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Mail className="mr-2 h-4 w-4" />
                    Reply via Email
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleReplyViaEmail(selectedInquiry.familyEmail, selectedInquiry.familyName, "gmail")}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                    </svg>
                    Gmail
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleReplyViaEmail(selectedInquiry.familyEmail, selectedInquiry.familyName, "outlook")}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.154-.352.23-.58.23h-8.547v-6.959l1.6 1.229c.1.086.215.129.346.129.14 0 .26-.05.363-.148l.796-.697a.478.478 0 0 0 .168-.377.478.478 0 0 0-.168-.377l-5.106-4.322a.478.478 0 0 0-.377-.148.478.478 0 0 0-.377.148L6.773 11.47a.478.478 0 0 0-.168.377c0 .148.056.274.168.377l.796.697a.478.478 0 0 0 .363.148.478.478 0 0 0 .346-.129l1.6-1.229v6.96H.818a.788.788 0 0 1-.58-.23A.788.788 0 0 1 0 17.865V7.387l9.818 7.628c.334.26.717.39 1.15.39.432 0 .815-.13 1.15-.39L24 7.387zM23.762 5.33a.764.764 0 0 1 .238.568v.126l-11.58 9.044a.478.478 0 0 1-.377.148.478.478 0 0 1-.377-.148L.42 5.83v-.126c0-.216.08-.407.238-.568A.788.788 0 0 1 1.238 5h21.524c.228 0 .422.077.58.23.158.154.238.346.238.568v.532z"/>
                    </svg>
                    Outlook
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleReplyViaEmail(selectedInquiry.familyEmail, selectedInquiry.familyName, "yahoo")}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.996 18.326l-.396.024V24l.396.025C17.064 23.49 20 20.121 20 16V8.5l-.396-.025C15.68 8.995 12.996 11.879 12.996 15.5v2.826zM11 24v-5.674l.396-.024c0-3.621-2.684-6.505-6.608-7.025L4.393 11.3V16c0 4.121 2.936 7.49 6.607 8z"/>
                    </svg>
                    Yahoo Mail
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleCopyEmail(selectedInquiry.familyEmail)}
                  >
                    {copiedEmail ? (
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    {copiedEmail ? "Copied!" : "Copy Email Address"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Archive className="h-4 w-4" />
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
                    <AlertDialogAction onClick={() => handleArchive(selectedInquiry.id)}>
                      Archive
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

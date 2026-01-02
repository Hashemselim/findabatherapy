"use client";

import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Mail,
  MailOpen,
  Reply,
  Archive,
  Phone,
  Building2,
  Loader2,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  Star,
  Bug,
  Lightbulb,
  MessageSquare,
  HelpCircle,
  Heart,
  Globe,
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
import {
  type Feedback,
  markFeedbackAsRead,
  markFeedbackAsReplied,
  archiveFeedback,
} from "@/lib/actions/feedback";
import type { FeedbackStatus, FeedbackCategory } from "@/lib/validations/feedback";

interface FeedbackListProps {
  initialFeedback: Feedback[];
  initialUnreadCount: number;
}

const statusConfig: Record<
  FeedbackStatus,
  { label: string; variant: "default" | "secondary" | "outline"; icon: typeof Mail }
> = {
  unread: { label: "New", variant: "default", icon: Mail },
  read: { label: "Read", variant: "secondary", icon: MailOpen },
  replied: { label: "Replied", variant: "outline", icon: Reply },
  archived: { label: "Archived", variant: "outline", icon: Archive },
};

const categoryConfig: Record<
  FeedbackCategory,
  { label: string; icon: typeof Bug; color: string }
> = {
  feature_request: { label: "Feature Request", icon: Lightbulb, color: "text-amber-500" },
  bug_report: { label: "Bug Report", icon: Bug, color: "text-red-500" },
  general_feedback: { label: "General Feedback", icon: MessageSquare, color: "text-blue-500" },
  question: { label: "Question", icon: HelpCircle, color: "text-purple-500" },
  compliment: { label: "Compliment", icon: Heart, color: "text-pink-500" },
};

export function FeedbackList({ initialFeedback, initialUnreadCount }: FeedbackListProps) {
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>(initialFeedback);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | "all">("all");
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleReplyViaEmail = (email: string, name: string, client: "gmail" | "outlook" | "yahoo") => {
    const subject = encodeURIComponent(`Re: Your feedback on FindABATherapy`);
    const body = encodeURIComponent(`Hi ${name.split(" ")[0]},\n\nThank you for your feedback!\n\n`);

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

  const handleViewFeedback = async (feedback: Feedback) => {
    setSelectedFeedback(feedback);

    // Mark as read if unread
    if (feedback.status === "unread") {
      const result = await markFeedbackAsRead(feedback.id);
      if (result.success) {
        setFeedbackItems((prev) =>
          prev.map((f) =>
            f.id === feedback.id ? { ...f, status: "read" as FeedbackStatus, readAt: new Date().toISOString() } : f
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setSelectedFeedback((prev) =>
          prev ? { ...prev, status: "read" as FeedbackStatus, readAt: new Date().toISOString() } : null
        );
      }
    }
  };

  const handleMarkAsReplied = async (feedbackId: string) => {
    setIsLoading(feedbackId);
    const result = await markFeedbackAsReplied(feedbackId);
    if (result.success) {
      setFeedbackItems((prev) =>
        prev.map((f) =>
          f.id === feedbackId ? { ...f, status: "replied" as FeedbackStatus, repliedAt: new Date().toISOString() } : f
        )
      );
      setSelectedFeedback((prev) =>
        prev?.id === feedbackId ? { ...prev, status: "replied" as FeedbackStatus, repliedAt: new Date().toISOString() } : prev
      );
    }
    setIsLoading(null);
  };

  const handleArchive = async (feedbackId: string) => {
    setIsLoading(feedbackId);
    const result = await archiveFeedback(feedbackId);
    if (result.success) {
      setFeedbackItems((prev) => prev.filter((f) => f.id !== feedbackId));
      setSelectedFeedback(null);
    }
    setIsLoading(null);
  };

  // Filter by status and category
  let filteredFeedback = statusFilter === "all"
    ? feedbackItems
    : feedbackItems.filter((f) => f.status === statusFilter);

  if (categoryFilter !== "all") {
    filteredFeedback = filteredFeedback.filter((f) => f.category === categoryFilter);
  }

  const renderRating = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-col gap-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All ({feedbackItems.length})
          </Button>
          <Button
            variant={statusFilter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("unread")}
          >
            <Mail className="mr-1 h-4 w-4" />
            New ({unreadCount})
          </Button>
          <Button
            variant={statusFilter === "read" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("read")}
          >
            <MailOpen className="mr-1 h-4 w-4" />
            Read
          </Button>
          <Button
            variant={statusFilter === "replied" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("replied")}
          >
            <Reply className="mr-1 h-4 w-4" />
            Replied
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={categoryFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
          >
            All Types
          </Button>
          {Object.entries(categoryConfig).map(([value, config]) => {
            const Icon = config.icon;
            return (
              <Button
                key={value}
                variant={categoryFilter === value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setCategoryFilter(value as FeedbackCategory)}
              >
                <Icon className={`mr-1 h-4 w-4 ${config.color}`} />
                {config.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Feedback List */}
      {filteredFeedback.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground">No feedback found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter === "all" && categoryFilter === "all"
                ? "When users submit feedback, it will appear here."
                : "No feedback matches your current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredFeedback.map((feedback) => {
            const statusConf = statusConfig[feedback.status];
            const categoryConf = categoryConfig[feedback.category];
            const StatusIcon = statusConf.icon;
            const CategoryIcon = categoryConf.icon;

            return (
              <Card
                key={feedback.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  feedback.status === "unread" ? "border-primary/50 bg-primary/5" : ""
                }`}
                onClick={() => handleViewFeedback(feedback)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                    <StatusIcon className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {feedback.name}
                      </span>
                      <Badge variant={statusConf.variant} className="text-xs">
                        {statusConf.label}
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-xs font-normal">
                        <CategoryIcon className={`h-3 w-3 ${categoryConf.color}`} />
                        {categoryConf.label}
                      </Badge>
                      {feedback.rating && renderRating(feedback.rating)}
                    </div>
                    {feedback.company && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {feedback.company}
                      </p>
                    )}
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {feedback.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        {selectedFeedback && (
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {selectedFeedback.name}
                <Badge variant={statusConfig[selectedFeedback.status].variant}>
                  {statusConfig[selectedFeedback.status].label}
                </Badge>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs font-normal">
                  {(() => {
                    const conf = categoryConfig[selectedFeedback.category];
                    const Icon = conf.icon;
                    return (
                      <>
                        <Icon className={`h-3 w-3 ${conf.color}`} />
                        {conf.label}
                      </>
                    );
                  })()}
                </Badge>
                <span>
                  {format(new Date(selectedFeedback.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Contact Info */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${selectedFeedback.email}`}
                      className="text-[#5788FF] hover:underline"
                    >
                      {selectedFeedback.email}
                    </a>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                  {selectedFeedback.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`tel:${selectedFeedback.phone}`}
                        className="text-[#5788FF] hover:underline"
                      >
                        {selectedFeedback.phone}
                      </a>
                    </div>
                  )}
                  {selectedFeedback.company && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {selectedFeedback.company}
                      </span>
                    </div>
                  )}
                  {selectedFeedback.pageUrl && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate text-muted-foreground" title={selectedFeedback.pageUrl}>
                        {selectedFeedback.pageUrl}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rating */}
              {selectedFeedback.rating && (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                  <h4 className="mb-2 text-sm font-medium text-foreground">Rating</h4>
                  <div className="flex items-center gap-2">
                    {renderRating(selectedFeedback.rating)}
                    <span className="text-sm text-muted-foreground">
                      ({selectedFeedback.rating}/5)
                    </span>
                  </div>
                </div>
              )}

              {/* Message */}
              <div>
                <h4 className="mb-2 text-sm font-medium text-foreground">Feedback</h4>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {selectedFeedback.message}
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              {selectedFeedback.status !== "replied" && (
                <Button
                  variant="outline"
                  onClick={() => handleMarkAsReplied(selectedFeedback.id)}
                  disabled={isLoading === selectedFeedback.id}
                >
                  {isLoading === selectedFeedback.id ? (
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
                    onClick={() => handleReplyViaEmail(selectedFeedback.email, selectedFeedback.name, "gmail")}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                    </svg>
                    Gmail
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleReplyViaEmail(selectedFeedback.email, selectedFeedback.name, "outlook")}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.154-.352.23-.58.23h-8.547v-6.959l1.6 1.229c.1.086.215.129.346.129.14 0 .26-.05.363-.148l.796-.697a.478.478 0 0 0 .168-.377.478.478 0 0 0-.168-.377l-5.106-4.322a.478.478 0 0 0-.377-.148.478.478 0 0 0-.377.148L6.773 11.47a.478.478 0 0 0-.168.377c0 .148.056.274.168.377l.796.697a.478.478 0 0 0 .363.148.478.478 0 0 0 .346-.129l1.6-1.229v6.96H.818a.788.788 0 0 1-.58-.23A.788.788 0 0 1 0 17.865V7.387l9.818 7.628c.334.26.717.39 1.15.39.432 0 .815-.13 1.15-.39L24 7.387zM23.762 5.33a.764.764 0 0 1 .238.568v.126l-11.58 9.044a.478.478 0 0 1-.377.148.478.478 0 0 1-.377-.148L.42 5.83v-.126c0-.216.08-.407.238-.568A.788.788 0 0 1 1.238 5h21.524c.228 0 .422.077.58.23.158.154.238.346.238.568v.532z"/>
                    </svg>
                    Outlook
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleReplyViaEmail(selectedFeedback.email, selectedFeedback.name, "yahoo")}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.996 18.326l-.396.024V24l.396.025C17.064 23.49 20 20.121 20 16V8.5l-.396-.025C15.68 8.995 12.996 11.879 12.996 15.5v2.826zM11 24v-5.674l.396-.024c0-3.621-2.684-6.505-6.608-7.025L4.393 11.3V16c0 4.121 2.936 7.49 6.607 8z"/>
                    </svg>
                    Yahoo Mail
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleCopyEmail(selectedFeedback.email)}
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
                    <AlertDialogTitle>Archive Feedback</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will move the feedback to your archive. You can&apos;t undo this action.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleArchive(selectedFeedback.id)}>
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

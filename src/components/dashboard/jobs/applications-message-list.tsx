"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Briefcase, Star } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ApplicationSummary } from "@/lib/actions/applications";

interface ApplicationsMessageListProps {
  applications: ApplicationSummary[];
  selectedId: string | null;
  onSelect: (application: ApplicationSummary) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ApplicationsMessageList({
  applications,
  selectedId,
  onSelect,
}: ApplicationsMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    setCanScrollUp(el.scrollTop > 0);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);

    // Calculate thumb size and position
    const trackHeight = el.clientHeight;
    const contentHeight = el.scrollHeight;
    const scrollTop = el.scrollTop;

    if (contentHeight <= trackHeight) {
      setThumbHeight(0);
      setThumbTop(0);
    } else {
      const ratio = trackHeight / contentHeight;
      const newThumbHeight = Math.max(ratio * trackHeight, 40); // Min 40px thumb
      const scrollRatio = scrollTop / (contentHeight - trackHeight);
      const newThumbTop = scrollRatio * (trackHeight - newThumbHeight);
      setThumbHeight(newThumbHeight);
      setThumbTop(newThumbTop);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState);

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [applications, updateScrollState]);

  // Handle thumb drag
  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartScrollTop.current = scrollRef.current?.scrollTop || 0;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const el = scrollRef.current;
      if (!el) return;

      const deltaY = e.clientY - dragStartY.current;
      const trackHeight = el.clientHeight;
      const contentHeight = el.scrollHeight;
      const scrollableHeight = contentHeight - trackHeight;
      const thumbTrackHeight = trackHeight - thumbHeight;
      const scrollDelta = (deltaY / thumbTrackHeight) * scrollableHeight;

      el.scrollTop = dragStartScrollTop.current + scrollDelta;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, thumbHeight]);

  // Handle track click
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const track = e.currentTarget;
    if (!el || e.target !== track) return;

    const rect = track.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = el.clientHeight;
    const contentHeight = el.scrollHeight;
    const scrollableHeight = contentHeight - trackHeight;
    const clickRatio = clickY / trackHeight;

    el.scrollTop = clickRatio * scrollableHeight;
  };

  const showScrollbar = thumbHeight > 0;

  return (
    <Card className="flex h-full min-h-[300px] w-full flex-col border-border/60">
      <CardHeader className="shrink-0 py-3">
        <CardTitle className="text-base">Applications</CardTitle>
      </CardHeader>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Top fade indicator */}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-card to-transparent transition-opacity",
            canScrollUp ? "opacity-100" : "opacity-0"
          )}
        />
        {/* Bottom fade indicator */}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-card to-transparent transition-opacity",
            canScrollDown ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Content + scrollbar container */}
        <div className="flex h-full">
          {/* Scrollable content */}
          <div
            ref={scrollRef}
            className="scrollbar-hide min-h-0 flex-1 overflow-y-auto p-2"
          >
            <div className="space-y-2">
              {applications.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No applications found
                </p>
              ) : (
                applications.map((application) => (
                  <button
                    key={application.id}
                    onClick={() => onSelect(application)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedId === application.id
                        ? "border-emerald-500 bg-emerald-500/5"
                        : "border-border/60 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0 border border-border">
                        <AvatarFallback className="bg-emerald-50 text-sm font-medium text-emerald-700">
                          {getInitials(application.applicantName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {application.status === "new" && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                          )}
                          <span className="truncate font-medium">
                            {application.applicantName}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Briefcase className="h-3 w-3 shrink-0" />
                          <span className="truncate">{application.job.title}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(application.createdAt), "MMM d, yyyy")}
                          </span>
                          <div className="flex items-center gap-2">
                            {application.rating && (
                              <span className="flex items-center gap-0.5 text-xs text-amber-600">
                                <Star className="h-3 w-3 fill-current" />
                                {application.rating}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground/70">
                              {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Custom scrollbar track - always visible */}
          <div
            className="relative w-2 shrink-0 cursor-pointer rounded-full bg-muted/50"
            onClick={handleTrackClick}
          >
            {/* Scrollbar thumb */}
            {showScrollbar && (
              <div
                ref={thumbRef}
                className={cn(
                  "absolute left-0 right-0 rounded-full bg-muted-foreground/30 transition-colors hover:bg-muted-foreground/50",
                  isDragging && "bg-muted-foreground/50"
                )}
                style={{
                  height: `${thumbHeight}px`,
                  top: `${thumbTop}px`,
                }}
                onMouseDown={handleThumbMouseDown}
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

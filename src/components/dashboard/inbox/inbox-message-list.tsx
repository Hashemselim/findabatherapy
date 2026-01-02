"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { MapPin } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Inquiry } from "@/lib/actions/inquiries";

interface InboxMessageListProps {
  inquiries: Inquiry[];
  selectedId: string | null;
  onSelect: (inquiry: Inquiry) => void;
}

function getLocationDisplayName(inquiry: Inquiry): string | null {
  if (!inquiry.location) return null;
  return inquiry.location.label || `${inquiry.location.city}, ${inquiry.location.state}`;
}

export function InboxMessageList({
  inquiries,
  selectedId,
  onSelect,
}: InboxMessageListProps) {
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
  }, [inquiries, updateScrollState]);

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
        <CardTitle className="text-base">Messages</CardTitle>
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
          {inquiries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages found
            </p>
          ) : (
            inquiries.map((inquiry) => {
              const locationName = getLocationDisplayName(inquiry);
              return (
                <button
                  key={inquiry.id}
                  onClick={() => onSelect(inquiry)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedId === inquiry.id
                      ? "border-[#5788FF] bg-[#5788FF]/5"
                      : "border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 truncate">
                      <div className="flex items-center gap-2">
                        {inquiry.status === "unread" && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#5788FF]" />
                        )}
                        <span className="truncate font-medium">{inquiry.familyName}</span>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {inquiry.message}
                      </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(inquiry.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {locationName && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {locationName}
                    </div>
                  )}
                </button>
              );
            })
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

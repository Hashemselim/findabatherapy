"use client";

import { useState } from "react";

import {
  InboxStats,
  InboxFilters,
  InboxMessageList,
  InboxMessageDetail,
  type InboxFilter,
} from "@/components/dashboard/inbox";
import { DemoCTABanner } from "@/components/demo/demo-cta-banner";
import { useDemoContext } from "@/contexts/demo-context";
import { DEMO_INQUIRIES } from "@/lib/demo/data";
import type { Inquiry } from "@/lib/actions/inquiries";

export default function DemoInboxPage() {
  const { showDemoToast } = useDemoContext();
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(
    DEMO_INQUIRIES[0]
  );
  const [filter, setFilter] = useState<InboxFilter>("all");

  const handleDemoAction = () => {
    showDemoToast("Inbox actions are disabled in demo mode");
  };

  const filteredInquiries = DEMO_INQUIRIES.filter((inquiry) => {
    if (filter === "all") return true;
    return inquiry.status === filter;
  });

  const unreadCount = DEMO_INQUIRIES.filter((i) => i.status === "unread").length;
  const readCount = DEMO_INQUIRIES.filter((i) => i.status === "read").length;
  const repliedCount = DEMO_INQUIRIES.filter((i) => i.status === "replied").length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden sm:gap-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Contact Form Inbox
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
          Manage inquiries from families interested in your services.
        </p>
      </div>

      {/* Stats */}
      <div className="shrink-0">
        <InboxStats
          unreadCount={unreadCount}
          readCount={readCount}
          repliedCount={repliedCount}
          totalCount={DEMO_INQUIRIES.length}
        />
      </div>

      {/* Filters */}
      <div className="shrink-0">
        <InboxFilters
          filter={filter}
          onFilterChange={setFilter}
          unreadCount={unreadCount}
          readCount={readCount}
          repliedCount={repliedCount}
          totalCount={DEMO_INQUIRIES.length}
        />
      </div>

      {/* Two-panel inbox layout */}
      <div
        data-tour="inbox"
        className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[350px_1fr]"
      >
        <InboxMessageList
          inquiries={filteredInquiries}
          selectedId={selectedInquiry?.id || null}
          onSelect={setSelectedInquiry}
        />
        <InboxMessageDetail
          inquiry={selectedInquiry}
          isDemo
          onDemoAction={handleDemoAction}
        />
      </div>

      <div className="shrink-0">
        <DemoCTABanner />
      </div>
    </div>
  );
}

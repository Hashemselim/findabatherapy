"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  InboxFilters,
  InboxMessageList,
  InboxMessageDetail,
  type InboxFilter,
} from "@/components/dashboard/inbox";
import type { LocationOption } from "@/components/dashboard/analytics-location-filter";
import {
  type Inquiry,
  markInquiryAsRead,
  markInquiryAsReplied,
  archiveInquiry,
} from "@/lib/actions/inquiries";
import { convertInquiryToClient } from "@/lib/actions/clients";
import type { InquiryStatus } from "@/lib/validations/contact";
import { toast } from "sonner";

interface InquiriesListProps {
  initialInquiries: Inquiry[];
  initialUnreadCount: number;
  locations: LocationOption[];
}

export function InquiriesList({
  initialInquiries,
  initialUnreadCount,
  locations,
}: InquiriesListProps) {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(
    initialInquiries[0] || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(
    locations.map((l) => l.id)
  );
  // Track if user has explicitly selected a message (for mobile view switching)
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Calculate stats
  const readCount = inquiries.filter((i) => i.status === "read").length;
  const repliedCount = inquiries.filter((i) => i.status === "replied").length;

  // Filter inquiries
  let filteredInquiries = filter === "all"
    ? inquiries
    : inquiries.filter((i) => i.status === filter);

  // Filter by location
  const allLocationsSelected = selectedLocationIds.length === locations.length;
  if (!allLocationsSelected && selectedLocationIds.length > 0) {
    filteredInquiries = filteredInquiries.filter(
      (i) => i.locationId === null || selectedLocationIds.includes(i.locationId)
    );
  }

  const handleSelectInquiry = async (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setMobileShowDetail(true); // Show detail view on mobile

    // Mark as read if unread
    if (inquiry.status === "unread") {
      const result = await markInquiryAsRead(inquiry.id);
      if (result.success) {
        setInquiries((prev) =>
          prev.map((i) =>
            i.id === inquiry.id
              ? { ...i, status: "read" as InquiryStatus, readAt: new Date().toISOString() }
              : i
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setSelectedInquiry((prev) =>
          prev
            ? { ...prev, status: "read" as InquiryStatus, readAt: new Date().toISOString() }
            : null
        );
      }
    }
  };

  const handleMarkAsReplied = async (inquiryId: string) => {
    setIsLoading(true);
    const result = await markInquiryAsReplied(inquiryId);
    if (result.success) {
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === inquiryId
            ? { ...i, status: "replied" as InquiryStatus, repliedAt: new Date().toISOString() }
            : i
        )
      );
      setSelectedInquiry((prev) =>
        prev?.id === inquiryId
          ? { ...prev, status: "replied" as InquiryStatus, repliedAt: new Date().toISOString() }
          : prev
      );
    }
    setIsLoading(false);
  };

  const handleArchive = async (inquiryId: string) => {
    setIsLoading(true);
    const result = await archiveInquiry(inquiryId);
    if (result.success) {
      setInquiries((prev) => prev.filter((i) => i.id !== inquiryId));
      // Select next inquiry or null
      const remaining = inquiries.filter((i) => i.id !== inquiryId);
      setSelectedInquiry(remaining[0] || null);
    }
    setIsLoading(false);
  };

  const handleConvertToClient = async (inquiryId: string) => {
    setIsConverting(true);
    const result = await convertInquiryToClient(inquiryId);
    if (result.success && result.data) {
      toast.success("Opening client form with inquiry data...");
      // Navigate to new client form with inquiry ID as query param
      router.push(`/dashboard/clients/new?inquiry=${inquiryId}`);
    } else if (!result.success) {
      toast.error(result.error || "Failed to convert inquiry");
      setIsConverting(false);
    }
  };

  const handleBackToList = () => {
    setMobileShowDetail(false);
  };

  return (
    <>
      {/* Mobile layout - page scrolls naturally */}
      <div className="flex flex-col gap-3 lg:hidden">
        {/* Filters with counts - hide when viewing detail */}
        {!mobileShowDetail && (
          <InboxFilters
            filter={filter}
            onFilterChange={setFilter}
            unreadCount={unreadCount}
            readCount={readCount}
            repliedCount={repliedCount}
            totalCount={inquiries.length}
            locations={locations}
            selectedLocationIds={selectedLocationIds}
            onLocationChange={setSelectedLocationIds}
          />
        )}

        {/* Show either list or detail */}
        {!mobileShowDetail ? (
          <InboxMessageList
            inquiries={filteredInquiries}
            selectedId={selectedInquiry?.id || null}
            onSelect={handleSelectInquiry}
          />
        ) : (
          <InboxMessageDetail
            inquiry={selectedInquiry}
            onMarkAsReplied={handleMarkAsReplied}
            onArchive={handleArchive}
            onConvertToClient={handleConvertToClient}
            isLoading={isLoading}
            isConverting={isConverting}
            onBack={handleBackToList}
            showBackButton
          />
        )}
      </div>

      {/* Desktop layout - fixed height with internal scroll */}
      <div className="hidden min-h-0 flex-1 flex-col gap-3 lg:flex">
        <InboxFilters
          filter={filter}
          onFilterChange={setFilter}
          unreadCount={unreadCount}
          readCount={readCount}
          repliedCount={repliedCount}
          totalCount={inquiries.length}
          locations={locations}
          selectedLocationIds={selectedLocationIds}
          onLocationChange={setSelectedLocationIds}
        />

        {/* Two-panel layout */}
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="w-[350px] shrink-0">
            <InboxMessageList
              inquiries={filteredInquiries}
              selectedId={selectedInquiry?.id || null}
              onSelect={handleSelectInquiry}
            />
          </div>
          <div className="flex min-h-0 flex-1">
            <InboxMessageDetail
              inquiry={selectedInquiry}
              onMarkAsReplied={handleMarkAsReplied}
              onArchive={handleArchive}
              onConvertToClient={handleConvertToClient}
              isLoading={isLoading}
              isConverting={isConverting}
            />
          </div>
        </div>
      </div>
    </>
  );
}

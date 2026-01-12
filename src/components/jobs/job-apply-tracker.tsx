"use client";

/**
 * Track a job apply button click
 * Call this function when user clicks the apply button
 */
export function trackJobApplyClick(
  jobId: string,
  jobSlug: string,
  profileId: string,
  positionType: string
): void {
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "job_apply_click",
      jobId,
      jobSlug,
      profileId,
      positionType,
    }),
  }).catch(() => {
    // Silently fail - don't disrupt user experience
  });
}

/**
 * Track a job search result click
 * Call this function when user clicks on a job card in search results
 */
export function trackJobSearchClick(
  jobId: string,
  position: number,
  searchQuery?: string
): void {
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "job_search_click",
      jobId,
      position,
      searchQuery,
    }),
  }).catch(() => {
    // Silently fail - don't disrupt user experience
  });
}

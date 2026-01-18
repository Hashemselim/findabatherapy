"use client";

import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

interface RelativeTimeProps {
  date: string | Date;
  addSuffix?: boolean;
  className?: string;
}

/**
 * Client-only relative time component to avoid hydration mismatch.
 * Server renders nothing, client renders the relative time after mount.
 */
export function RelativeTime({ date, addSuffix = true, className }: RelativeTimeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;

  return (
    <span className={className}>
      {formatDistanceToNow(dateObj, { addSuffix })}
    </span>
  );
}

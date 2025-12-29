import type { TimePeriod } from "./events";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

/**
 * Get the date range for a given time period
 * - month: Current month (1st to today)
 * - quarter: Current quarter (1st day of quarter to today)
 * - year: Current year (Jan 1 to today)
 */
export function getDateRangeForPeriod(period: TimePeriod): DateRange {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let start: Date;

  switch (period) {
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter": {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterStartMonth, 1);
      break;
    }
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { start, end };
}

/**
 * Get the previous period's date range for comparison
 * - month: Previous month
 * - quarter: Previous quarter
 * - year: Previous year
 */
export function getPreviousPeriodRange(period: TimePeriod): DateRange {
  const now = new Date();

  switch (period) {
    case "month": {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: prevMonth,
        end: lastDayPrev,
      };
    }
    case "quarter": {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const prevQuarterStart = new Date(now.getFullYear(), quarterStartMonth - 3, 1);
      const prevQuarterEnd = new Date(now.getFullYear(), quarterStartMonth, 0);
      return {
        start: prevQuarterStart,
        end: prevQuarterEnd,
      };
    }
    case "year": {
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31),
      };
    }
    default:
      return getPreviousPeriodRange("month");
  }
}

/**
 * Get the appropriate time granularity for a period
 * - month: daily
 * - quarter: weekly
 * - year: monthly
 */
export function getGranularityForPeriod(period: TimePeriod): "daily" | "weekly" | "monthly" {
  switch (period) {
    case "month":
      return "daily";
    case "quarter":
      return "weekly";
    case "year":
      return "monthly";
    default:
      return "daily";
  }
}

/**
 * Format a date for display based on granularity
 */
export function formatDateForGranularity(
  date: Date,
  granularity: "daily" | "weekly" | "monthly"
): string {
  switch (granularity) {
    case "daily":
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "weekly":
      return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    case "monthly":
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Aggregate time series data to the appropriate granularity
 */
export function aggregateToGranularity(
  data: TimeSeriesDataPoint[],
  granularity: "daily" | "weekly" | "monthly"
): TimeSeriesDataPoint[] {
  if (data.length === 0) return [];

  // Data is already daily from the DB
  if (granularity === "daily") {
    return data;
  }

  const aggregated = new Map<string, number>();

  for (const point of data) {
    const date = new Date(point.date);
    let key: string;

    if (granularity === "weekly") {
      // Get the Monday of this week
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      key = monday.toISOString().split("T")[0];
    } else {
      // Monthly: use first of month
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    }

    aggregated.set(key, (aggregated.get(key) || 0) + point.value);
  }

  return Array.from(aggregated.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate percentage change between two values
 */
export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Format a date range for display
 */
export function formatDateRange(range: DateRange): string {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = range.start.toLocaleDateString("en-US", options);
  const endStr = range.end.toLocaleDateString("en-US", options);
  return `${startStr} - ${endStr}`;
}

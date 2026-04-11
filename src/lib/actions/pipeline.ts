"use server";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface AttentionItem {
  type: "overdue_task" | "expiring_auth" | "stale_inquiry" | "stale_waitlist";
  clientId: string;
  clientName: string;
  description: string;
  dueDate?: string;
  daysSince?: number;
}

export interface ActivityItem {
  type: "new_client" | "status_change" | "communication_sent" | "task_completed";
  clientId: string;
  clientName: string;
  description: string;
  timestamp: string;
}

export interface PipelineSummary {
  counts: Record<string, number>;
  attentionItems: AttentionItem[];
  recentActivity: ActivityItem[];
}

export async function getPipelineData(): Promise<ActionResult<PipelineSummary>> {
  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const result = await queryConvex<PipelineSummary>("crm:getPipelineData", {});
    return { success: true, data: result };
  } catch (error) {
    console.error("Convex error:", error);
    return { success: false, error: "Not authenticated" };
  }
}

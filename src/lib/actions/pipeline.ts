"use server";

import { createClient as createSupabaseClient, getUser } from "@/lib/supabase/server";

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// PIPELINE DATA
// =============================================================================

/**
 * Get full pipeline data: stage counts, attention items, and recent activity
 */
export async function getPipelineData(): Promise<ActionResult<PipelineSummary>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  // Run all queries in parallel for performance
  const [countsResult, attentionResult, activityResult] = await Promise.all([
    getStatusCounts(supabase, user.id),
    getAttentionItems(supabase, user.id),
    getRecentActivity(supabase, user.id),
  ]);

  return {
    success: true,
    data: {
      counts: countsResult,
      attentionItems: attentionResult,
      recentActivity: activityResult,
    },
  };
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseClient>>;

const STATUS_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  intake_pending: "Intake Pending",
  waitlist: "Waitlist",
  assessment: "Assessment",
  authorization: "Authorization",
  active: "Active",
  on_hold: "On Hold",
  discharged: "Discharged",
};

function formatStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

/**
 * Get client counts grouped by status using database aggregation
 */
async function getStatusCounts(
  supabase: SupabaseClient,
  profileId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("clients")
    .select("status")
    .eq("profile_id", profileId)
    .is("deleted_at", null);

  if (error) {
    console.error("[PIPELINE] Failed to fetch status counts:", error);
    return {};
  }

  // Count in JS since Supabase doesn't support GROUP BY directly in PostgREST
  const counts: Record<string, number> = {
    inquiry: 0,
    intake_pending: 0,
    waitlist: 0,
    assessment: 0,
    authorization: 0,
    active: 0,
    on_hold: 0,
    discharged: 0,
  };

  for (const row of data || []) {
    if (row.status in counts) {
      counts[row.status]++;
    }
  }

  return counts;
}

/**
 * Get attention items: overdue tasks, expiring auths, stale clients
 */
async function getAttentionItems(
  supabase: SupabaseClient,
  profileId: string
): Promise<AttentionItem[]> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const items: AttentionItem[] = [];

  // 1. Overdue tasks
  const { data: overdueTasks } = await supabase
    .from("client_tasks")
    .select(`
      id,
      title,
      due_date,
      client_id,
      clients!inner(child_first_name, child_last_name)
    `)
    .eq("profile_id", profileId)
    .neq("status", "completed")
    .lt("due_date", today)
    .order("due_date", { ascending: true })
    .limit(5);

  for (const task of overdueTasks || []) {
    const client = task.clients as unknown as { child_first_name: string | null; child_last_name: string | null };
    const name = [client?.child_first_name, client?.child_last_name].filter(Boolean).join(" ") || "Unknown";
    items.push({
      type: "overdue_task",
      clientId: task.client_id,
      clientName: name,
      description: `Overdue task: "${task.title}"`,
      dueDate: task.due_date,
    });
  }

  // 2. Expiring authorizations (within 30 days)
  // Note: client_authorizations doesn't have profile_id — filter through clients join
  const { data: expiringAuths } = await supabase
    .from("client_authorizations")
    .select(`
      id,
      end_date,
      auth_reference_number,
      client_id,
      clients!inner(child_first_name, child_last_name, profile_id)
    `)
    .eq("clients.profile_id", profileId)
    .gt("end_date", today)
    .lte("end_date", thirtyDaysFromNow)
    .not("status", "in", '("expired","exhausted")')
    .order("end_date", { ascending: true })
    .limit(5);

  for (const auth of expiringAuths || []) {
    const client = auth.clients as unknown as { child_first_name: string | null; child_last_name: string | null };
    const name = [client?.child_first_name, client?.child_last_name].filter(Boolean).join(" ") || "Unknown";
    const daysLeft = Math.ceil(
      (new Date(auth.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    items.push({
      type: "expiring_auth",
      clientId: auth.client_id,
      clientName: name,
      description: `Authorization expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      dueDate: auth.end_date,
    });
  }

  // 3. Stale inquiries (>7 days without communication)
  const { data: staleInquiries } = await supabase
    .from("clients")
    .select(`
      id,
      child_first_name,
      child_last_name,
      created_at,
      status
    `)
    .eq("profile_id", profileId)
    .in("status", ["inquiry", "intake_pending"])
    .is("deleted_at", null)
    .lt("created_at", sevenDaysAgo);

  if (staleInquiries && staleInquiries.length > 0) {
    // Check which of these have recent communications
    const clientIds = staleInquiries.map((c) => c.id);
    const { data: recentComms } = await supabase
      .from("client_communications")
      .select("client_id, sent_at")
      .eq("profile_id", profileId)
      .in("client_id", clientIds)
      .gte("sent_at", sevenDaysAgo);

    const recentCommClientIds = new Set((recentComms || []).map((c) => c.client_id));

    for (const client of staleInquiries.slice(0, 5)) {
      if (!recentCommClientIds.has(client.id)) {
        const name = [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || "Unknown";
        const days = Math.floor(
          (now.getTime() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        items.push({
          type: "stale_inquiry",
          clientId: client.id,
          clientName: name,
          description: `${client.status === "inquiry" ? "Inquiry" : "Intake"} pending for ${days} days — no recent communication`,
          daysSince: days,
        });
      }
    }
  }

  // 4. Stale waitlist (>30 days without communication)
  const { data: staleWaitlist } = await supabase
    .from("clients")
    .select(`
      id,
      child_first_name,
      child_last_name,
      created_at
    `)
    .eq("profile_id", profileId)
    .eq("status", "waitlist")
    .is("deleted_at", null)
    .lt("created_at", thirtyDaysAgo);

  if (staleWaitlist && staleWaitlist.length > 0) {
    const waitlistIds = staleWaitlist.map((c) => c.id);
    const { data: recentComms } = await supabase
      .from("client_communications")
      .select("client_id, sent_at")
      .eq("profile_id", profileId)
      .in("client_id", waitlistIds)
      .gte("sent_at", thirtyDaysAgo);

    const recentCommClientIds = new Set((recentComms || []).map((c) => c.client_id));

    for (const client of staleWaitlist.slice(0, 3)) {
      if (!recentCommClientIds.has(client.id)) {
        const name = [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || "Unknown";
        const days = Math.floor(
          (now.getTime() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        items.push({
          type: "stale_waitlist",
          clientId: client.id,
          clientName: name,
          description: `On waitlist for ${days} days — no recent communication`,
          daysSince: days,
        });
      }
    }
  }

  return items.slice(0, 10);
}

/**
 * Get recent activity across clients
 */
async function getRecentActivity(
  supabase: SupabaseClient,
  profileId: string
): Promise<ActivityItem[]> {
  const items: ActivityItem[] = [];

  // Run queries in parallel
  const [newClients, recentComms, completedTasks, statusChanges] = await Promise.all([
    // Recent new clients
    supabase
      .from("clients")
      .select("id, child_first_name, child_last_name, status, created_at")
      .eq("profile_id", profileId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),

    // Recent communications
    supabase
      .from("client_communications")
      .select(`
        id, subject, sent_at, client_id,
        clients!inner(child_first_name, child_last_name)
      `)
      .eq("profile_id", profileId)
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(5),

    // Recently completed tasks
    supabase
      .from("client_tasks")
      .select(`
        id, title, completed_at, client_id,
        clients!inner(child_first_name, child_last_name)
      `)
      .eq("profile_id", profileId)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(5),

    // Recent status changes
    supabase
      .from("client_status_changes")
      .select(`
        id, from_status, to_status, changed_at, client_id,
        clients!inner(child_first_name, child_last_name)
      `)
      .eq("profile_id", profileId)
      .order("changed_at", { ascending: false })
      .limit(5),
  ]);

  // New clients
  for (const client of newClients.data || []) {
    const name = [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || "New Client";
    items.push({
      type: "new_client",
      clientId: client.id,
      clientName: name,
      description: `New ${client.status === "inquiry" ? "inquiry" : "client"}: ${name}`,
      timestamp: client.created_at,
    });
  }

  // Status changes
  for (const change of statusChanges.data || []) {
    const client = change.clients as unknown as { child_first_name: string | null; child_last_name: string | null };
    const name = [client?.child_first_name, client?.child_last_name].filter(Boolean).join(" ") || "Unknown";
    const fromLabel = formatStatusLabel(change.from_status);
    const toLabel = formatStatusLabel(change.to_status);
    items.push({
      type: "status_change",
      clientId: change.client_id,
      clientName: name,
      description: `${name} moved from ${fromLabel} to ${toLabel}`,
      timestamp: change.changed_at,
    });
  }

  // Communications sent
  for (const comm of recentComms.data || []) {
    const client = comm.clients as unknown as { child_first_name: string | null; child_last_name: string | null };
    const name = [client?.child_first_name, client?.child_last_name].filter(Boolean).join(" ") || "Unknown";
    items.push({
      type: "communication_sent",
      clientId: comm.client_id,
      clientName: name,
      description: `Email sent to ${name}: "${comm.subject}"`,
      timestamp: comm.sent_at,
    });
  }

  // Completed tasks
  for (const task of completedTasks.data || []) {
    const client = task.clients as unknown as { child_first_name: string | null; child_last_name: string | null };
    const name = [client?.child_first_name, client?.child_last_name].filter(Boolean).join(" ") || "Unknown";
    items.push({
      type: "task_completed",
      clientId: task.client_id,
      clientName: name,
      description: `Task completed: "${task.title}"`,
      timestamp: task.completed_at,
    });
  }

  // Sort by timestamp descending and limit to 10
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, 10);
}

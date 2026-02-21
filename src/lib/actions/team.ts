"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient, getUser } from "@/lib/supabase/server";
import { guardCredentialTracking } from "@/lib/plans/guards";
import {
  teamMemberSchema,
  teamCredentialSchema,
  teamDocumentSchema,
  teamTaskSchema,
} from "@/lib/validations/team";

// =============================================================================
// TYPES
// =============================================================================

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface TeamMember {
  id: string;
  profile_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  role: string | null;
  notes: string | null;
  status: "active" | "inactive";
  hired_date: string | null;
  job_application_id: string | null;
  created_at: string;
  updated_at: string;
  // Aggregated counts (populated when fetching list)
  credential_count?: number;
  expiring_credential_count?: number;
}

export interface TeamCredential {
  id: string;
  team_member_id: string | null;
  profile_id: string;
  employee_name: string;
  credential_name: string;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamDocument {
  id: string;
  team_member_id: string;
  label: string | null;
  url: string | null;
  file_path: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TeamTask {
  id: string;
  client_id: string | null;
  team_member_id: string | null;
  profile_id: string;
  title: string;
  content: string | null;
  status: "pending" | "in_progress" | "completed";
  due_date: string | null;
  auto_generated: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// TEAM MEMBER CRUD
// =============================================================================

/**
 * List all team members for the current user
 */
export async function getTeamMembers(): Promise<ActionResult<TeamMember[]>> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const guard = await guardCredentialTracking();
  if (!guard.allowed) return { success: false, error: guard.reason };

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[TEAM] Failed to fetch team members:", error);
    return { success: false, error: "Failed to load team members" };
  }

  // Fetch credential counts per team member
  const teamIds = (data || []).map((m) => m.id);
  let credentialMap: Record<string, { total: number; expiring: number }> = {};

  if (teamIds.length > 0) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const { data: creds } = await supabase
      .from("employee_credentials")
      .select("team_member_id, expiration_date")
      .in("team_member_id", teamIds)
      .is("deleted_at", null);

    if (creds) {
      credentialMap = creds.reduce(
        (acc, c) => {
          const tmId = c.team_member_id;
          if (!tmId) return acc;
          if (!acc[tmId]) acc[tmId] = { total: 0, expiring: 0 };
          acc[tmId].total++;
          if (c.expiration_date && c.expiration_date <= thirtyDaysFromNow) {
            acc[tmId].expiring++;
          }
          return acc;
        },
        {} as Record<string, { total: number; expiring: number }>
      );
    }
  }

  const members: TeamMember[] = (data || []).map((m) => ({
    ...m,
    credential_count: credentialMap[m.id]?.total ?? 0,
    expiring_credential_count: credentialMap[m.id]?.expiring ?? 0,
  }));

  return { success: true, data: members };
}

/**
 * Get a single team member with all related data
 */
export async function getTeamMember(
  memberId: string
): Promise<
  ActionResult<{
    member: TeamMember;
    credentials: TeamCredential[];
    documents: TeamDocument[];
    tasks: TeamTask[];
  }>
> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const supabase = await createSupabaseClient();

  const { data: member, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", memberId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error || !member) {
    return { success: false, error: "Team member not found" };
  }

  // Fetch related data in parallel
  const [credResult, docResult, taskResult] = await Promise.all([
    supabase
      .from("employee_credentials")
      .select("*")
      .eq("team_member_id", memberId)
      .eq("profile_id", user.id)
      .is("deleted_at", null)
      .order("expiration_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("employee_documents")
      .select("*")
      .eq("team_member_id", memberId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
    supabase
      .from("client_tasks")
      .select("*")
      .eq("team_member_id", memberId)
      .eq("profile_id", user.id)
      .is("deleted_at", null)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  return {
    success: true,
    data: {
      member: member as TeamMember,
      credentials: (credResult.data || []) as TeamCredential[],
      documents: (docResult.data || []) as TeamDocument[],
      tasks: (taskResult.data || []) as TeamTask[],
    },
  };
}

/**
 * Create a team member
 */
export async function createTeamMember(
  data: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const guard = await guardCredentialTracking();
  if (!guard.allowed) return { success: false, error: guard.reason };

  const parsed = teamMemberSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  const { data: member, error } = await supabase
    .from("team_members")
    .insert({
      profile_id: user.id,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      role: parsed.data.role || null,
      notes: parsed.data.notes || null,
      status: parsed.data.status || "active",
      hired_date: parsed.data.hired_date || null,
    })
    .select("id")
    .single();

  if (error || !member) {
    console.error("[TEAM] Failed to create team member:", error);
    return { success: false, error: "Failed to create team member" };
  }

  revalidatePath("/dashboard/team/employees");
  return { success: true, data: { id: member.id } };
}

/**
 * Update a team member
 */
export async function updateTeamMember(
  memberId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = teamMemberSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  const { error } = await supabase
    .from("team_members")
    .update({
      ...parsed.data,
      email: parsed.data.email || null,
      last_name: parsed.data.last_name || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      role: parsed.data.role || null,
      notes: parsed.data.notes || null,
      hired_date: parsed.data.hired_date || null,
    })
    .eq("id", memberId)
    .eq("profile_id", user.id)
    .is("deleted_at", null);

  if (error) {
    console.error("[TEAM] Failed to update team member:", error);
    return { success: false, error: "Failed to update team member" };
  }

  revalidatePath("/dashboard/team/employees");
  revalidatePath(`/dashboard/team/employees/${memberId}`);
  return { success: true };
}

/**
 * Soft delete a team member
 */
export async function deleteTeamMember(memberId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const supabase = await createSupabaseClient();

  const { error } = await supabase
    .from("team_members")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("profile_id", user.id);

  if (error) {
    console.error("[TEAM] Failed to delete team member:", error);
    return { success: false, error: "Failed to delete team member" };
  }

  revalidatePath("/dashboard/team/employees");
  return { success: true };
}

// =============================================================================
// CREDENTIAL CRUD
// =============================================================================

export async function addTeamCredential(
  teamMemberId: string,
  data: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = teamCredentialSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  // Verify team member ownership
  const { data: member } = await supabase
    .from("team_members")
    .select("id, first_name, last_name")
    .eq("id", teamMemberId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!member) return { success: false, error: "Team member not found" };

  const employeeName = [member.first_name, member.last_name].filter(Boolean).join(" ");

  const { data: cred, error } = await supabase
    .from("employee_credentials")
    .insert({
      profile_id: user.id,
      team_member_id: teamMemberId,
      employee_name: employeeName,
      credential_name: parsed.data.credential_name,
      expiration_date: parsed.data.expiration_date || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error || !cred) {
    console.error("[TEAM] Failed to add credential:", error);
    return { success: false, error: "Failed to add credential" };
  }

  revalidatePath(`/dashboard/team/employees/${teamMemberId}`);
  return { success: true, data: { id: cred.id } };
}

export async function updateTeamCredential(
  credentialId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = teamCredentialSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  const { error } = await supabase
    .from("employee_credentials")
    .update({
      credential_name: parsed.data.credential_name,
      expiration_date: parsed.data.expiration_date || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", credentialId)
    .eq("profile_id", user.id)
    .is("deleted_at", null);

  if (error) {
    console.error("[TEAM] Failed to update credential:", error);
    return { success: false, error: "Failed to update credential" };
  }

  revalidatePath("/dashboard/team/employees");
  return { success: true };
}

export async function deleteTeamCredential(credentialId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const supabase = await createSupabaseClient();

  const { error } = await supabase
    .from("employee_credentials")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", credentialId)
    .eq("profile_id", user.id);

  if (error) {
    console.error("[TEAM] Failed to delete credential:", error);
    return { success: false, error: "Failed to delete credential" };
  }

  revalidatePath("/dashboard/team/employees");
  return { success: true };
}

// =============================================================================
// DOCUMENT CRUD
// =============================================================================

export async function addTeamDocument(
  teamMemberId: string,
  data: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = teamDocumentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  // Verify team member ownership
  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("id", teamMemberId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!member) return { success: false, error: "Team member not found" };

  const { data: doc, error } = await supabase
    .from("employee_documents")
    .insert({
      team_member_id: teamMemberId,
      label: parsed.data.label,
      url: parsed.data.url || null,
      file_path: parsed.data.file_path || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error || !doc) {
    console.error("[TEAM] Failed to add document:", error);
    return { success: false, error: "Failed to add document" };
  }

  revalidatePath(`/dashboard/team/employees/${teamMemberId}`);
  return { success: true, data: { id: doc.id } };
}

export async function deleteTeamDocument(documentId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const supabase = await createSupabaseClient();

  // Verify document belongs to user's team member
  const { data: doc } = await supabase
    .from("employee_documents")
    .select("id, team_member_id")
    .eq("id", documentId)
    .single();

  if (!doc) return { success: false, error: "Document not found" };

  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("id", doc.team_member_id)
    .eq("profile_id", user.id)
    .single();

  if (!member) return { success: false, error: "Not authorized" };

  const { error } = await supabase
    .from("employee_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId);

  if (error) {
    console.error("[TEAM] Failed to delete document:", error);
    return { success: false, error: "Failed to delete document" };
  }

  revalidatePath("/dashboard/team/employees");
  return { success: true };
}

// =============================================================================
// TEAM TASKS (uses client_tasks with team_member_id)
// =============================================================================

export async function getTeamMemberTasks(
  teamMemberId: string
): Promise<ActionResult<TeamTask[]>> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("client_tasks")
    .select("*")
    .eq("team_member_id", teamMemberId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[TEAM] Failed to fetch team tasks:", error);
    return { success: false, error: "Failed to load tasks" };
  }

  return { success: true, data: (data || []) as TeamTask[] };
}

export async function createTeamTask(
  teamMemberId: string,
  data: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = teamTaskSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  // Verify team member ownership
  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("id", teamMemberId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!member) return { success: false, error: "Team member not found" };

  const { data: task, error } = await supabase
    .from("client_tasks")
    .insert({
      client_id: null,
      team_member_id: teamMemberId,
      profile_id: user.id,
      title: parsed.data.title,
      content: parsed.data.content || null,
      status: parsed.data.status || "pending",
      due_date: parsed.data.due_date || null,
    })
    .select("id")
    .single();

  if (error || !task) {
    console.error("[TEAM] Failed to create task:", error);
    return { success: false, error: "Failed to create task" };
  }

  revalidatePath(`/dashboard/team/employees/${teamMemberId}`);
  return { success: true, data: { id: task.id } };
}

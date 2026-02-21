"use server";

import { createClient as createSupabaseClient, getUser } from "@/lib/supabase/server";
import { createNotification } from "@/lib/actions/notifications";

// =============================================================================
// TYPES
// =============================================================================

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

interface AutomationResult {
  tasksCreated: number;
  errors: string[];
}

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseClient>>;

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Run task automation for the current user.
 * Scans for expiring authorizations and credentials, creates auto-generated
 * reminder tasks with duplicate prevention.
 *
 * Called from the pipeline dashboard page on load (non-blocking).
 */
export async function runTaskAutomation(): Promise<ActionResult<AutomationResult>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();
  const result: AutomationResult = { tasksCreated: 0, errors: [] };

  // Run automation checks in parallel
  const [authResult, credResult] = await Promise.all([
    checkAuthorizationExpirations(supabase, user.id),
    checkCredentialExpirations(supabase, user.id),
  ]);

  result.tasksCreated = authResult.tasksCreated + credResult.tasksCreated;
  result.errors = [...authResult.errors, ...credResult.errors];

  return { success: true, data: result };
}

// =============================================================================
// AUTHORIZATION EXPIRATION CHECK
// =============================================================================

/**
 * Scan for client authorizations expiring within 14 days and create
 * reminder tasks if none exist yet.
 */
async function checkAuthorizationExpirations(
  supabase: SupabaseClient,
  profileId: string
): Promise<AutomationResult> {
  const result: AutomationResult = { tasksCreated: 0, errors: [] };

  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Find authorizations expiring within 30 days
    // Note: client_authorizations doesn't have profile_id — filter through clients join
    const { data: expiringAuths, error } = await supabase
      .from("client_authorizations")
      .select(`
        id,
        end_date,
        auth_reference_number,
        service_type,
        client_id,
        clients!inner(child_first_name, child_last_name, profile_id)
      `)
      .eq("clients.profile_id", profileId)
      .gte("end_date", today)
      .lte("end_date", thirtyDaysFromNow)
      .not("status", "in", '("expired","exhausted")')
      .is("deleted_at", null);

    if (error) {
      console.error("[AUTOMATION] Failed to fetch expiring authorizations:", error);
      result.errors.push("Failed to check authorization expirations");
      return result;
    }

    if (!expiringAuths || expiringAuths.length === 0) {
      return result;
    }

    // For each expiring authorization, check if a task already exists
    for (const auth of expiringAuths) {
      const client = auth.clients as unknown as {
        child_first_name: string | null;
        child_last_name: string | null;
        profile_id: string;
      };
      const clientName = [client?.child_first_name, client?.child_last_name]
        .filter(Boolean)
        .join(" ") || "Unknown";

      const titlePattern = `Renew authorization${auth.auth_reference_number ? ` (${auth.auth_reference_number})` : ""}`;

      // Check for existing auto-generated task with same pattern and due date
      const isDuplicate = await checkDuplicateTask(
        supabase,
        profileId,
        auth.client_id,
        titlePattern,
        auth.end_date
      );

      if (isDuplicate) {
        continue;
      }

      // Create the auto-generated task
      const daysLeft = Math.ceil(
        (new Date(auth.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const serviceLabel = auth.service_type || "service";
      const taskContent = `Authorization for ${serviceLabel} expires on ${auth.end_date} (${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining). Client: ${clientName}.${auth.auth_reference_number ? ` Ref: ${auth.auth_reference_number}` : ""}`;

      const { error: insertError } = await supabase
        .from("client_tasks")
        .insert({
          client_id: auth.client_id,
          profile_id: profileId,
          title: titlePattern,
          content: taskContent,
          status: "pending",
          due_date: auth.end_date,
          auto_generated: true,
        });

      if (insertError) {
        console.error("[AUTOMATION] Failed to create auth task:", insertError);
        result.errors.push(`Failed to create task for ${clientName} auth expiration`);
      } else {
        result.tasksCreated++;

        // Create in-app notification
        createNotification({
          profileId,
          type: "auth_expiring",
          title: `Authorization expiring for ${clientName}`,
          body: `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`,
          link: `/dashboard/clients/${auth.client_id}`,
          entityId: auth.id,
          entityType: "client_authorization",
        }).catch((err) => {
          console.error("[AUTOMATION] Failed to create auth notification:", err);
        });
      }
    }
  } catch (err) {
    console.error("[AUTOMATION] Authorization check error:", err);
    result.errors.push("Unexpected error checking authorization expirations");
  }

  return result;
}

// =============================================================================
// CREDENTIAL EXPIRATION CHECK
// =============================================================================

/**
 * Scan for employee credentials expiring within 30 days and create
 * reminder tasks (not tied to a specific client).
 */
async function checkCredentialExpirations(
  supabase: SupabaseClient,
  profileId: string
): Promise<AutomationResult> {
  const result: AutomationResult = { tasksCreated: 0, errors: [] };

  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Find credentials expiring within 30 days
    const { data: expiringCreds, error } = await supabase
      .from("employee_credentials")
      .select("id, employee_name, credential_name, expiration_date")
      .eq("profile_id", profileId)
      .gte("expiration_date", today)
      .lte("expiration_date", thirtyDaysFromNow)
      .is("deleted_at", null);

    if (error) {
      console.error("[AUTOMATION] Failed to fetch expiring credentials:", error);
      result.errors.push("Failed to check credential expirations");
      return result;
    }

    if (!expiringCreds || expiringCreds.length === 0) {
      return result;
    }

    for (const cred of expiringCreds) {
      const titlePattern = `Renew credential: ${cred.credential_name} (${cred.employee_name})`;

      // Check for existing auto-generated task (no client_id for credentials)
      const isDuplicate = await checkDuplicateTask(
        supabase,
        profileId,
        null,
        titlePattern,
        cred.expiration_date
      );

      if (isDuplicate) {
        continue;
      }

      const daysLeft = Math.ceil(
        (new Date(cred.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const taskContent = `${cred.credential_name} for ${cred.employee_name} expires on ${cred.expiration_date} (${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining).`;

      const { error: insertError } = await supabase
        .from("client_tasks")
        .insert({
          client_id: null,
          profile_id: profileId,
          title: titlePattern,
          content: taskContent,
          status: "pending",
          due_date: cred.expiration_date,
          auto_generated: true,
        });

      if (insertError) {
        console.error("[AUTOMATION] Failed to create credential task:", insertError);
        result.errors.push(`Failed to create task for ${cred.employee_name} credential`);
      } else {
        result.tasksCreated++;

        // Create in-app notification
        createNotification({
          profileId,
          type: "credential_expiring",
          title: `Credential expiring: ${cred.credential_name}`,
          body: `${cred.employee_name} — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`,
          link: "/dashboard/tasks",
          entityId: cred.id,
          entityType: "employee_credential",
        }).catch((err) => {
          console.error("[AUTOMATION] Failed to create credential notification:", err);
        });
      }
    }
  } catch (err) {
    console.error("[AUTOMATION] Credential check error:", err);
    result.errors.push("Unexpected error checking credential expirations");
  }

  return result;
}

// =============================================================================
// DUPLICATE PREVENTION
// =============================================================================

/**
 * Check if an auto-generated task already exists with the same title pattern,
 * client, and due date. Prevents creating duplicate reminder tasks.
 */
async function checkDuplicateTask(
  supabase: SupabaseClient,
  profileId: string,
  clientId: string | null,
  title: string,
  dueDate: string
): Promise<boolean> {
  let query = supabase
    .from("client_tasks")
    .select("id")
    .eq("profile_id", profileId)
    .eq("title", title)
    .eq("due_date", dueDate)
    .eq("auto_generated", true)
    .is("deleted_at", null)
    .limit(1);

  if (clientId) {
    query = query.eq("client_id", clientId);
  } else {
    query = query.is("client_id", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[AUTOMATION] Duplicate check failed:", error);
    // If duplicate check fails, err on the side of not creating a duplicate
    return true;
  }

  return (data?.length ?? 0) > 0;
}

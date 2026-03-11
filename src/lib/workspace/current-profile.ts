import type { SupabaseClient } from "@supabase/supabase-js";

type MembershipLookupClient = Pick<SupabaseClient, "from">;

export async function resolveCurrentWorkspaceProfileId(
  supabase: MembershipLookupClient,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("profile_memberships")
    .select("profile_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[WORKSPACE] Failed to resolve active workspace profile:", error);
  }

  return data?.profile_id || userId;
}

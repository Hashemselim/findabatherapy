"use server";

import { revalidatePath } from "next/cache";

import {
  createClient as createSupabaseClient,
  getCurrentProfileId,
} from "@/lib/supabase/server";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface ClientNote {
  id: string;
  clientId: string | null;
  clientName: string | null;
  profileId: string;
  category: "session" | "call" | "admin" | "clinical" | "general";
  body: string;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
}

// ---------------------------------------------------------------------------
// Fetch notes for a specific client
// ---------------------------------------------------------------------------
export async function getClientNotes(
  clientId: string
): Promise<ActionResult<ClientNote[]>> {
  try {
    const supabase = await createSupabaseClient();
    const profileId = await getCurrentProfileId();
    if (!profileId) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("client_notes")
      .select("*, profiles!inner(display_name), clients(child_first_name, child_last_name)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    const notes: ClientNote[] = (data || []).map(
      (row: Record<string, unknown>) => {
        const client = row.clients as Record<string, unknown> | null;
        const clientName = client
          ? [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || null
          : null;
        return {
          id: row.id as string,
          clientId: row.client_id as string | null,
          clientName,
          profileId: row.profile_id as string,
          category: row.category as ClientNote["category"],
          body: row.body as string,
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
          authorName: (row.profiles as Record<string, unknown>)
            ?.display_name as string | null,
        };
      }
    );

    return { success: true, data: notes };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch notes",
    };
  }
}

// ---------------------------------------------------------------------------
// Fetch ALL notes across all clients (for the dashboard Notes page)
// ---------------------------------------------------------------------------
export async function getAllNotes(): Promise<ActionResult<ClientNote[]>> {
  try {
    const supabase = await createSupabaseClient();
    const profileId = await getCurrentProfileId();
    if (!profileId) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("client_notes")
      .select("*, profiles!inner(display_name), clients(child_first_name, child_last_name)")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    const notes: ClientNote[] = (data || []).map(
      (row: Record<string, unknown>) => {
        const client = row.clients as Record<string, unknown> | null;
        const clientName = client
          ? [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || null
          : null;
        return {
          id: row.id as string,
          clientId: row.client_id as string | null,
          clientName,
          profileId: row.profile_id as string,
          category: row.category as ClientNote["category"],
          body: row.body as string,
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
          authorName: (row.profiles as Record<string, unknown>)
            ?.display_name as string | null,
        };
      }
    );

    return { success: true, data: notes };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch notes",
    };
  }
}

// ---------------------------------------------------------------------------
// Add a note (client is optional — null = unassigned)
// ---------------------------------------------------------------------------
export async function addClientNote(input: {
  clientId?: string | null;
  category: ClientNote["category"];
  body: string;
}): Promise<ActionResult<ClientNote>> {
  try {
    const supabase = await createSupabaseClient();
    const profileId = await getCurrentProfileId();
    if (!profileId) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("client_notes")
      .insert({
        client_id: input.clientId || null,
        profile_id: profileId,
        category: input.category,
        body: input.body,
      })
      .select("*, profiles!inner(display_name), clients(child_first_name, child_last_name)")
      .single();

    if (error) return { success: false, error: error.message };

    if (input.clientId) {
      revalidatePath(`/dashboard/clients/${input.clientId}`);
    }
    revalidatePath("/dashboard/notes");

    const client = data.clients as Record<string, unknown> | null;
    const clientName = client
      ? [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || null
      : null;

    const note: ClientNote = {
      id: data.id,
      clientId: data.client_id,
      clientName,
      profileId: data.profile_id,
      category: data.category,
      body: data.body,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      authorName: (data.profiles as Record<string, unknown>)
        ?.display_name as string | null,
    };

    return { success: true, data: note };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to add note",
    };
  }
}

// ---------------------------------------------------------------------------
// Update a note
// ---------------------------------------------------------------------------
export async function updateClientNote(
  noteId: string,
  input: { category?: ClientNote["category"]; body?: string; clientId?: string | null }
): Promise<ActionResult<void>> {
  try {
    const supabase = await createSupabaseClient();
    const profileId = await getCurrentProfileId();
    if (!profileId) return { success: false, error: "Not authenticated" };

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.category !== undefined) updateData.category = input.category;
    if (input.body !== undefined) updateData.body = input.body;
    if (input.clientId !== undefined) updateData.client_id = input.clientId || null;

    const { error } = await supabase
      .from("client_notes")
      .update(updateData)
      .eq("id", noteId)
      .eq("profile_id", profileId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/notes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update note",
    };
  }
}

// ---------------------------------------------------------------------------
// Delete a note
// ---------------------------------------------------------------------------
export async function deleteClientNote(
  noteId: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createSupabaseClient();
    const profileId = await getCurrentProfileId();
    if (!profileId) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("client_notes")
      .delete()
      .eq("id", noteId)
      .eq("profile_id", profileId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/notes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete note",
    };
  }
}

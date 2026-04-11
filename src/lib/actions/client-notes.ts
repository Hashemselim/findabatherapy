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
  clientId: string;
  profileId: string;
  category: "session" | "call" | "admin" | "clinical" | "general";
  body: string;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
}

export async function getClientNotes(
  clientId: string
): Promise<ActionResult<ClientNote[]>> {
  try {
    const supabase = await createSupabaseClient();
    const profileId = await getCurrentProfileId();
    if (!profileId) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("client_notes")
      .select("*, profiles!inner(display_name)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    const notes: ClientNote[] = (data || []).map(
      (row: Record<string, unknown>) => ({
        id: row.id as string,
        clientId: row.client_id as string,
        profileId: row.profile_id as string,
        category: row.category as ClientNote["category"],
        body: row.body as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        authorName: (row.profiles as Record<string, unknown>)
          ?.display_name as string | null,
      })
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

export async function addClientNote(input: {
  clientId: string;
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
        client_id: input.clientId,
        profile_id: profileId,
        category: input.category,
        body: input.body,
      })
      .select("*, profiles!inner(display_name)")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath(`/dashboard/clients/${input.clientId}`);

    const note: ClientNote = {
      id: data.id,
      clientId: data.client_id,
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

export async function updateClientNote(
  noteId: string,
  input: { category?: ClientNote["category"]; body?: string }
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

    const { error } = await supabase
      .from("client_notes")
      .update(updateData)
      .eq("id", noteId)
      .eq("profile_id", profileId);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update note",
    };
  }
}

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

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete note",
    };
  }
}

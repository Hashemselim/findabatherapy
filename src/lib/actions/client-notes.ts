"use server";

import { revalidatePath } from "next/cache";

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
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const data = await queryConvex<ClientNote[]>("clientNotes:getClientNotes", {
      clientId,
    });
    return { success: true, data: data || [] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch notes",
    };
  }
}

// ---------------------------------------------------------------------------
// Fetch ALL notes across all clients (for the dashboard Notes page)
// ---------------------------------------------------------------------------
export async function getAllNotes(): Promise<ActionResult<ClientNote[]>> {
  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const data = await queryConvex<ClientNote[]>("clientNotes:getClientNotes", {});
    return { success: true, data: data || [] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch notes",
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
    const { mutateConvex } = await import("@/lib/platform/convex/server");

    const result = await mutateConvex<{ id: string }>("clientNotes:addNote", {
      clientId: input.clientId || undefined,
      category: input.category,
      body: input.body,
    });

    if (!result?.id) {
      return { success: false, error: "Failed to create note" };
    }

    if (input.clientId) {
      revalidatePath(`/dashboard/clients/${input.clientId}`);
    }
    revalidatePath("/dashboard/notes");

    return {
      success: true,
      data: {
        id: result.id,
        clientId: input.clientId ?? null,
        clientName: null,
        profileId: "",
        category: input.category,
        body: input.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorName: null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add note",
    };
  }
}

// ---------------------------------------------------------------------------
// Update a note
// ---------------------------------------------------------------------------
export async function updateClientNote(
  noteId: string,
  input: {
    category?: ClientNote["category"];
    body?: string;
    clientId?: string | null;
  }
): Promise<ActionResult<void>> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");

    await mutateConvex("clientNotes:updateNote", {
      noteId,
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.clientId !== undefined
        ? { clientId: input.clientId || undefined }
        : {}),
    });

    revalidatePath("/dashboard/notes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update note",
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
    const { mutateConvex } = await import("@/lib/platform/convex/server");

    await mutateConvex("clientNotes:deleteNote", { noteId });

    revalidatePath("/dashboard/notes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete note",
    };
  }
}

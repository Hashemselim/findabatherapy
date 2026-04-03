import "server-only";

import { cookies } from "next/headers";

export const WORKSPACE_INVITE_COOKIE = "workspace_invite_token";

export async function setWorkspaceInviteCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_INVITE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
}

export async function getWorkspaceInviteCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(WORKSPACE_INVITE_COOKIE)?.value ?? null;
}

export async function clearWorkspaceInviteCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(WORKSPACE_INVITE_COOKIE);
}

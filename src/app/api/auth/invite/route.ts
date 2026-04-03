import { NextResponse } from "next/server";

import { setWorkspaceInviteCookie } from "@/lib/workspace/invite-cookie";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { token?: string }
    | null;

  if (!body?.token) {
    return NextResponse.json(
      { error: "Invite token is required" },
      { status: 400 },
    );
  }

  await setWorkspaceInviteCookie(body.token);

  return NextResponse.json({ success: true });
}

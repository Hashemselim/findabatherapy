import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { claimPortalInviteForCurrentUser } from "@/lib/actions/client-portal";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL(`/portal/${slug}/sign-in`, requestUrl.origin));
  }

  const authState = await auth();
  if (!authState.userId) {
    const destination = new URL(`/portal/${slug}/sign-in`, requestUrl.origin);
    destination.searchParams.set("token", token);
    return NextResponse.redirect(destination);
  }

  const result = await claimPortalInviteForCurrentUser(slug, token);
  if (!result.success || !result.data) {
    const destination = new URL(`/portal/${slug}/sign-in`, requestUrl.origin);
    destination.searchParams.set("token", token);
    destination.searchParams.set(
      "error",
      result.success ? "Failed to open the family portal." : result.error,
    );
    return NextResponse.redirect(destination);
  }

  const destination = new URL(`/portal/${slug}`, requestUrl.origin);
  destination.searchParams.set("client", result.data.clientId);
  return NextResponse.redirect(destination);
}

import { NextResponse } from "next/server";

import {
  clearIntakeAccessTokenOnResponse,
  setIntakeAccessTokenOnResponse,
  validateIntakeAccessToken,
} from "@/lib/public-access";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  const ref = requestUrl.searchParams.get("ref");
  const portalTaskId = requestUrl.searchParams.get("portalTaskId");
  const destination = new URL(`/intake/${slug}/client`, requestUrl.origin);

  if (ref) {
    destination.searchParams.set("ref", ref);
  }
  if (portalTaskId) {
    destination.searchParams.set("portalTaskId", portalTaskId);
  }

  const response = NextResponse.redirect(destination);
  const existingCookieValue = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("public_intake_access="))
    ?.slice("public_intake_access=".length);

  if (token) {
    if (await validateIntakeAccessToken(slug, token)) {
      setIntakeAccessTokenOnResponse(response, existingCookieValue, slug, token);
    } else {
      clearIntakeAccessTokenOnResponse(response, existingCookieValue, slug);
    }
  }

  return response;
}

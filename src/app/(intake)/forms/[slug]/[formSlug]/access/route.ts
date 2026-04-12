import { NextResponse } from "next/server";

import {
  clearFormAccessTokenOnResponse,
  setFormAccessTokenOnResponse,
  validateFormAccessToken,
} from "@/lib/public-access";

type RouteParams = {
  params: Promise<{ slug: string; formSlug: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { slug, formSlug } = await params;
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  const portal = requestUrl.searchParams.get("portal");
  const destination = new URL(`/forms/${slug}/${formSlug}`, requestUrl.origin);
  if (portal === "1") {
    destination.searchParams.set("portal", "1");
  }
  const response = NextResponse.redirect(destination);
  const existingCookieValue = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("public_form_access="))
    ?.slice("public_form_access=".length);

  if (token) {
    if (await validateFormAccessToken(slug, formSlug, token)) {
      setFormAccessTokenOnResponse(response, existingCookieValue, slug, formSlug, token, requestUrl);
    } else {
      clearFormAccessTokenOnResponse(response, existingCookieValue, slug, formSlug, requestUrl);
    }
  }

  return response;
}

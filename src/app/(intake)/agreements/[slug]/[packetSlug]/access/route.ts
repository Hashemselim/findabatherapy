import { NextResponse } from "next/server";

import {
  clearAgreementAccessTokenOnResponse,
  setAgreementAccessTokenOnResponse,
  validateAgreementAccessToken,
} from "@/lib/public-access";

type RouteParams = {
  params: Promise<{ slug: string; packetSlug: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { slug, packetSlug } = await params;
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  const destination = new URL(`/agreements/${slug}/${packetSlug}`, requestUrl.origin);
  const response = NextResponse.redirect(destination);
  const existingCookieValue = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("public_agreement_access="))
    ?.slice("public_agreement_access=".length);

  if (token) {
    if (await validateAgreementAccessToken(slug, packetSlug, token)) {
      setAgreementAccessTokenOnResponse(
        response,
        existingCookieValue,
        slug,
        packetSlug,
        token,
        requestUrl,
      );
    } else {
      clearAgreementAccessTokenOnResponse(
        response,
        existingCookieValue,
        slug,
        packetSlug,
        requestUrl,
      );
    }
  }

  return response;
}

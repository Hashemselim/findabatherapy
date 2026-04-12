import { NextResponse } from "next/server";

import {
  clearDocumentAccessTokenOnResponse,
  setDocumentAccessTokenOnResponse,
  validateDocumentAccessToken,
} from "@/lib/public-access";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");
  const destination = new URL(`/intake/${slug}/documents`, requestUrl.origin);
  const response = NextResponse.redirect(destination);
  const existingCookieValue = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("public_document_access="))
    ?.slice("public_document_access=".length);

  if (token) {
    if (await validateDocumentAccessToken(slug, token)) {
      setDocumentAccessTokenOnResponse(response, existingCookieValue, slug, token, requestUrl);
    } else {
      clearDocumentAccessTokenOnResponse(response, existingCookieValue, slug, requestUrl);
    }
  }

  return response;
}

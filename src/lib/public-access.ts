import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const COOKIE_NAMES = {
  intake: "public_intake_access",
  documents: "public_document_access",
  agreements: "public_agreement_access",
  portal: "public_portal_access",
} as const;

type AccessKind = keyof typeof COOKIE_NAMES;
type AccessMap = Record<string, string>;

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

function decodeAccessMap(value?: string): AccessMap {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string" && entry[1].length > 0,
      ),
    );
  } catch {
    return {};
  }
}

function encodeAccessMap(value: AccessMap): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function readAccessMap(kind: AccessKind): Promise<AccessMap> {
  const cookieStore = await cookies();
  return decodeAccessMap(cookieStore.get(COOKIE_NAMES[kind])?.value);
}

async function writeAccessMap(kind: AccessKind, value: AccessMap, maxAgeSeconds: number) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES[kind], encodeAccessMap(value), {
    ...COOKIE_OPTIONS,
    maxAge: maxAgeSeconds,
  });
}

async function setAccessToken(
  kind: AccessKind,
  routeKey: string,
  token: string,
  maxAgeSeconds: number,
) {
  const current = await readAccessMap(kind);
  await writeAccessMap(kind, { ...current, [routeKey]: token }, maxAgeSeconds);
}

async function getAccessToken(kind: AccessKind, routeKey: string): Promise<string | null> {
  const current = await readAccessMap(kind);
  return current[routeKey] ?? null;
}

async function clearAccessToken(kind: AccessKind, routeKey: string) {
  const current = await readAccessMap(kind);
  if (!(routeKey in current)) {
    return;
  }

  delete current[routeKey];

  if (Object.keys(current).length === 0) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAMES[kind], "", {
      ...COOKIE_OPTIONS,
      maxAge: 0,
    });
    return;
  }

  await writeAccessMap(kind, current, 60 * 60 * 24 * 14);
}

export function buildIntakeAccessRouteKey(slug: string) {
  return `intake:${slug}`;
}

export function buildDocumentAccessRouteKey(slug: string) {
  return `documents:${slug}`;
}

export function buildAgreementAccessRouteKey(providerSlug: string, packetSlug: string) {
  return `agreements:${providerSlug}:${packetSlug}`;
}

export function buildPortalAccessRouteKey(slug: string) {
  return `portal:${slug}`;
}

export function buildIntakeAccessPath(slug: string) {
  return `/intake/${slug}/client/access`;
}

export function buildDocumentAccessPath(slug: string) {
  return `/intake/${slug}/documents/access`;
}

export function buildAgreementAccessPath(providerSlug: string, packetSlug: string) {
  return `/agreements/${providerSlug}/${packetSlug}/access`;
}

export function buildPortalAccessPath(slug: string) {
  return `/portal/${slug}/access`;
}

function writeResponseAccessMap(
  response: NextResponse,
  kind: AccessKind,
  value: AccessMap,
  maxAgeSeconds: number,
) {
  response.cookies.set(COOKIE_NAMES[kind], encodeAccessMap(value), {
    ...COOKIE_OPTIONS,
    maxAge: maxAgeSeconds,
  });
}

function clearResponseAccessMap(response: NextResponse, kind: AccessKind) {
  response.cookies.set(COOKIE_NAMES[kind], "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
}

function updateResponseAccessToken(
  response: NextResponse,
  kind: AccessKind,
  routeKey: string,
  existingCookieValue: string | undefined,
  token: string | null,
  maxAgeSeconds: number,
) {
  const current = decodeAccessMap(existingCookieValue);

  if (token) {
    writeResponseAccessMap(response, kind, { ...current, [routeKey]: token }, maxAgeSeconds);
    return;
  }

  if (!(routeKey in current)) {
    clearResponseAccessMap(response, kind);
    return;
  }

  delete current[routeKey];
  if (Object.keys(current).length === 0) {
    clearResponseAccessMap(response, kind);
    return;
  }

  writeResponseAccessMap(response, kind, current, maxAgeSeconds);
}

export function setIntakeAccessTokenOnResponse(
  response: NextResponse,
  existingCookieValue: string | undefined,
  slug: string,
  token: string,
) {
  updateResponseAccessToken(
    response,
    "intake",
    buildIntakeAccessRouteKey(slug),
    existingCookieValue,
    token,
    60 * 60 * 24 * 7,
  );
}

export function clearIntakeAccessTokenOnResponse(
  response: NextResponse,
  existingCookieValue: string | undefined,
  slug: string,
) {
  updateResponseAccessToken(
    response,
    "intake",
    buildIntakeAccessRouteKey(slug),
    existingCookieValue,
    null,
    60 * 60 * 24 * 7,
  );
}

export function setDocumentAccessTokenOnResponse(
  response: NextResponse,
  existingCookieValue: string | undefined,
  slug: string,
  token: string,
) {
  updateResponseAccessToken(
    response,
    "documents",
    buildDocumentAccessRouteKey(slug),
    existingCookieValue,
    token,
    60 * 60 * 24 * 7,
  );
}

export function clearDocumentAccessTokenOnResponse(
  response: NextResponse,
  existingCookieValue: string | undefined,
  slug: string,
) {
  updateResponseAccessToken(
    response,
    "documents",
    buildDocumentAccessRouteKey(slug),
    existingCookieValue,
    null,
    60 * 60 * 24 * 7,
  );
}

export function setAgreementAccessTokenOnResponse(
  response: NextResponse,
  existingCookieValue: string | undefined,
  providerSlug: string,
  packetSlug: string,
  token: string,
) {
  updateResponseAccessToken(
    response,
    "agreements",
    buildAgreementAccessRouteKey(providerSlug, packetSlug),
    existingCookieValue,
    token,
    60 * 60 * 24 * 14,
  );
}

export function clearAgreementAccessTokenOnResponse(
  response: NextResponse,
  existingCookieValue: string | undefined,
  providerSlug: string,
  packetSlug: string,
) {
  updateResponseAccessToken(
    response,
    "agreements",
    buildAgreementAccessRouteKey(providerSlug, packetSlug),
    existingCookieValue,
    null,
    60 * 60 * 24 * 14,
  );
}

export function setPortalAccessTokenOnResponse(
  response: NextResponse,
  existingCookieValue: string | undefined,
  slug: string,
  token: string,
) {
  updateResponseAccessToken(
    response,
    "portal",
    buildPortalAccessRouteKey(slug),
    existingCookieValue,
    token,
    60 * 60 * 24 * 30,
  );
}

export function clearPortalAccessTokenOnResponse(
  response: NextResponse,
  existingCookieValue: string | undefined,
  slug: string,
) {
  updateResponseAccessToken(
    response,
    "portal",
    buildPortalAccessRouteKey(slug),
    existingCookieValue,
    null,
    60 * 60 * 24 * 30,
  );
}

export async function setIntakeAccessToken(slug: string, token: string) {
  await setAccessToken("intake", buildIntakeAccessRouteKey(slug), token, 60 * 60 * 24 * 7);
}

export async function getIntakeAccessToken(slug: string): Promise<string | null> {
  return getAccessToken("intake", buildIntakeAccessRouteKey(slug));
}

export async function clearIntakeAccessToken(slug: string) {
  await clearAccessToken("intake", buildIntakeAccessRouteKey(slug));
}

export async function setDocumentAccessToken(slug: string, token: string) {
  await setAccessToken("documents", buildDocumentAccessRouteKey(slug), token, 60 * 60 * 24 * 7);
}

export async function getDocumentAccessToken(slug: string): Promise<string | null> {
  return getAccessToken("documents", buildDocumentAccessRouteKey(slug));
}

export async function clearDocumentAccessToken(slug: string) {
  await clearAccessToken("documents", buildDocumentAccessRouteKey(slug));
}

export async function setAgreementAccessToken(providerSlug: string, packetSlug: string, token: string) {
  await setAccessToken(
    "agreements",
    buildAgreementAccessRouteKey(providerSlug, packetSlug),
    token,
    60 * 60 * 24 * 14,
  );
}

export async function getAgreementAccessToken(
  providerSlug: string,
  packetSlug: string,
): Promise<string | null> {
  return getAccessToken("agreements", buildAgreementAccessRouteKey(providerSlug, packetSlug));
}

export async function clearAgreementAccessToken(providerSlug: string, packetSlug: string) {
  await clearAccessToken("agreements", buildAgreementAccessRouteKey(providerSlug, packetSlug));
}

export async function setPortalAccessToken(slug: string, token: string) {
  await setAccessToken("portal", buildPortalAccessRouteKey(slug), token, 60 * 60 * 24 * 30);
}

export async function getPortalAccessToken(slug: string): Promise<string | null> {
  return getAccessToken("portal", buildPortalAccessRouteKey(slug));
}

export async function clearPortalAccessToken(slug: string) {
  await clearAccessToken("portal", buildPortalAccessRouteKey(slug));
}

export async function validateIntakeAccessToken(slug: string, token: string): Promise<boolean> {
  try {
    const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    return await queryConvexUnauthenticated<boolean>("intake:validateIntakeAccessForSlug", {
      slug,
      token,
    });
  } catch {
    return false;
  }
}

export async function validateDocumentAccessToken(slug: string, token: string): Promise<boolean> {
  try {
    const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    return await queryConvexUnauthenticated<boolean>(
      "intake:validateClientDocumentUploadAccessForSlug",
      { slug, token },
    );
  } catch {
    return false;
  }
}

export async function validateAgreementAccessToken(
  providerSlug: string,
  packetSlug: string,
  token: string,
): Promise<boolean> {
  try {
    const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const result = await queryConvexUnauthenticated(
      "agreements:getAgreementPublicPageData",
      {
        providerSlug,
        packetSlug,
        token,
      },
    );
    return Boolean(result);
  } catch {
    return false;
  }
}

export async function validatePortalAccessToken(slug: string, token: string): Promise<boolean> {
  try {
    const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    return await queryConvexUnauthenticated<boolean>("clientPortal:validatePortalAccessForSlug", {
      slug,
      token,
    });
  } catch {
    return false;
  }
}

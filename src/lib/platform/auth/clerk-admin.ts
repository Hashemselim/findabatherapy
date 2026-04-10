import "server-only";

import { createClerkClient } from "@clerk/backend";

function getClerkAdminClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }

  return createClerkClient({ secretKey });
}

export async function ensureClerkUserForEmail(email: string) {
  const clerk = getClerkAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await clerk.users.getUserList({
    emailAddress: [normalizedEmail],
    limit: 1,
  });

  const existingUser = existing.data[0];
  if (existingUser) {
    return existingUser;
  }

  return clerk.users.createUser({
    emailAddress: [normalizedEmail],
    skipPasswordChecks: true,
    skipPasswordRequirement: true,
  });
}

export async function createClerkSignInTokenUrl(params: {
  email: string;
  targetUrl: string;
  expiresInSeconds?: number;
}) {
  const clerk = getClerkAdminClient();
  const user = await ensureClerkUserForEmail(params.email);
  const signInToken = await clerk.signInTokens.createSignInToken({
    userId: user.id,
    expiresInSeconds: params.expiresInSeconds ?? 600,
  });

  const targetUrl = new URL(params.targetUrl);
  targetUrl.searchParams.set("__clerk_ticket", signInToken.token);
  return {
    url: targetUrl.toString(),
    userId: user.id,
  };
}

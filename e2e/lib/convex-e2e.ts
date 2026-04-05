import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import { api } from "../../convex/_generated/api";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
export const AUTH_STATE_FILE = path.join(__dirname, "../.auth/user.json");
export const AUTH_USER_FILE = path.join(__dirname, "../.auth/user-meta.json");

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const SEED_SECRET = process.env.CONVEX_SEED_IMPORT_SECRET;

export type SessionUser = {
  clerkUserId: string;
  email: string;
  password: string;
  workspaceId: string;
  listingId: string;
};

export type ProvisionedWorkspace = {
  userId: string;
  workspaceId: string;
  listingId: string;
  locationId: string;
  jobPostingId: string;
  slug: string;
};

export function loadSessionUser(): SessionUser {
  if (!fs.existsSync(AUTH_USER_FILE)) {
    throw new Error(`Missing E2E auth metadata at ${AUTH_USER_FILE}`);
  }

  return JSON.parse(fs.readFileSync(AUTH_USER_FILE, "utf8")) as SessionUser;
}

export function getConvexSeedClient() {
  if (!CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for Convex E2E setup");
  }

  return new ConvexHttpClient(CONVEX_URL);
}

export function requireSeedSecret() {
  if (!SEED_SECRET) {
    throw new Error("CONVEX_SEED_IMPORT_SECRET is required for Convex E2E setup");
  }

  return SEED_SECRET;
}

export async function provisionDashboardWorkspaceForUser(
  user: SessionUser,
): Promise<ProvisionedWorkspace> {
  return getConvexSeedClient().mutation(api.seed.provisionE2EDashboardWorkspace, {
    secret: requireSeedSecret(),
    clerkUserId: user.clerkUserId,
    email: user.email,
  });
}

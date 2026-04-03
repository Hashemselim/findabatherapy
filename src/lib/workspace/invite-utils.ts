import { createHash, randomBytes } from "node:crypto";

export type SignupIntent = "therapy" | "jobs" | "both";

export type WorkspaceRole = "owner" | "admin" | "member";

export interface WorkspaceInviteDetails {
  id: string;
  profileId: string;
  agencyName: string;
  invitedEmail: string;
  role: WorkspaceRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  inviterName: string | null;
}

export class WorkspaceInviteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceInviteError";
  }
}

export function normalizeWorkspaceEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createInvitationToken() {
  return randomBytes(24).toString("hex");
}

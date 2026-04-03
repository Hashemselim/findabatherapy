export type WorkspaceRole = "owner" | "admin" | "member";

export interface PlatformUser {
  id: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  provider: "supabase" | "clerk";
}

export interface PlatformMembership {
  id: string;
  workspaceId: string;
  userId: string;
  email: string;
  role: WorkspaceRole;
  status: "active" | "revoked";
  invitedByUserId: string | null;
  joinedAt: string | null;
}

export interface PlatformWorkspace {
  id: string;
  slug?: string | null;
  agencyName?: string | null;
  contactEmail?: string | null;
  planTier?: string | null;
  subscriptionStatus?: string | null;
  billingInterval?: string | null;
  onboardingCompletedAt?: string | null;
  primaryIntent?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

export interface PlatformCurrentWorkspace {
  membership: PlatformMembership;
  workspace: PlatformWorkspace;
}

export interface BillingLinkage {
  workspaceId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId?: string | null;
}

export interface FileDescriptor {
  id: string;
  workspaceId: string;
  storageKey: string;
  bucket: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  visibility: "public" | "private";
}

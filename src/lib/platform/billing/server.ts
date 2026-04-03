import "server-only";

import type { BillingLinkage } from "@/lib/platform/contracts";
import { getCurrentWorkspace } from "@/lib/platform/workspace/server";

export async function getCurrentBillingLinkage(): Promise<BillingLinkage | null> {
  const current = await getCurrentWorkspace();
  if (!current) {
    return null;
  }

  return {
    workspaceId: current.workspace.id,
    stripeCustomerId: current.workspace.stripeCustomerId ?? null,
    stripeSubscriptionId: current.workspace.stripeSubscriptionId ?? null,
  };
}

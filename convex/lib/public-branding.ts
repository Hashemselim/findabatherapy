import type { MutationCtx, QueryCtx } from "../_generated/server";

type ConvexDoc = Record<string, unknown> & { _id: string };
type ConvexCtx = QueryCtx | MutationCtx;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asId<TableName extends string>(value: unknown) {
  return value as string & { __tableName: TableName };
}

export async function getPublicListingLogoUrl(
  ctx: ConvexCtx,
  listing: ConvexDoc | null | undefined,
  workspace?: ConvexDoc | null,
) {
  if (!listing) {
    return null;
  }

  const files = await ctx.db
    .query("files")
    .withIndex("by_related_record", (q) =>
      q.eq("relatedTable", "listings").eq("relatedId", listing._id),
    )
    .collect();
  const logoFile = files.find((file) => asRecord(file.metadata).kind === "logo") ?? null;
  const fileUrl =
    typeof logoFile?.storageId === "string"
      ? (await ctx.storage.getUrl(asId<"_storage">(logoFile.storageId))) ??
        readString(logoFile.publicPath)
      : readString(logoFile?.publicPath);
  const workspaceBranding = asRecord(asRecord(workspace?.settings).branding);
  const metadata = asRecord(listing.metadata);

  return fileUrl ?? readString(workspaceBranding.logoUrl) ?? readString(metadata.logoUrl);
}

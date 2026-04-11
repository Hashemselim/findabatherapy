import { NextRequest, NextResponse } from "next/server";

import { queryConvexUnauthenticated } from "@/lib/platform/convex/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const documentId = request.nextUrl.searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json({ error: "Missing document id" }, { status: 400 });
  }

  const document = await queryConvexUnauthenticated("agreements:getDocumentPreview", {
    documentId,
  }) as { downloadUrl: string; fileName: string } | null;

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const response = await fetch(document.downloadUrl);
  if (!response.ok) {
    console.error("[AGREEMENTS] Failed to download agreement document preview from Convex storage");
    return NextResponse.json({ error: "Unable to load document" }, { status: 500 });
  }

  const bytes = await response.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.fileName}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}

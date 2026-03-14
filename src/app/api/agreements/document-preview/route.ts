import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/storage/config";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const documentId = request.nextUrl.searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json({ error: "Missing document id" }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const { data: document } = await supabase
    .from("agreement_packet_version_documents")
    .select("id, file_name, file_path")
    .eq("id", documentId)
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { data: file, error } = await supabase.storage
    .from(STORAGE_BUCKETS.agreements)
    .download(document.file_path);

  if (error || !file) {
    console.error("[AGREEMENTS] Failed to download agreement document preview:", error);
    return NextResponse.json({ error: "Unable to load document" }, { status: 500 });
  }

  const bytes = await file.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.file_name}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}

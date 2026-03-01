import { NextResponse } from "next/server";

import { processDripEmails } from "@/lib/actions/drip-emails";

/**
 * Cron endpoint for processing drip emails.
 *
 * Call via Vercel Cron or external scheduler:
 *   GET /api/cron/drip-emails?key=<CRON_SECRET>
 *
 * Runs once per day. Sends the next drip email to each eligible free user.
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDripEmails();

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    sent: result.data?.sent ?? 0,
    errors: result.data?.errors ?? 0,
  });
}

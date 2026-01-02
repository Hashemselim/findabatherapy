import { NextRequest, NextResponse } from "next/server";
import { sendTestEmail } from "@/lib/email/notifications";

/**
 * Test email endpoint - sends sample branded emails
 *
 * Usage: POST /api/test-email
 * Body: { "to": "email@example.com", "type": "inquiry" | "payment_failure" | "subscription" | "feedback" }
 *
 * IMPORTANT: Remove or protect this endpoint in production
 */
export async function POST(request: NextRequest) {
  // Only allow in development or with proper auth
  if (process.env.NODE_ENV === "production") {
    // In production, require a secret key
    const authHeader = request.headers.get("authorization");
    const expectedKey = process.env.TEST_EMAIL_SECRET;

    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  try {
    const body = await request.json();
    const { to, type = "inquiry" } = body;

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'to' email address" },
        { status: 400 }
      );
    }

    const validTypes = ["inquiry", "payment_failure", "subscription", "subscription_enterprise", "feedback"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await sendTestEmail(to, type as "inquiry" | "payment_failure" | "subscription" | "subscription_enterprise" | "feedback");

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email (${type}) sent to ${to}`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[TEST-EMAIL] Error:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}

/**
 * Send all test emails at once
 *
 * Usage: POST /api/test-email/all
 * Body: { "to": "email@example.com" }
 */
export async function PUT(request: NextRequest) {
  // Only allow in development or with proper auth
  if (process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization");
    const expectedKey = process.env.TEST_EMAIL_SECRET;

    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  try {
    const body = await request.json();
    const { to } = body;

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'to' email address" },
        { status: 400 }
      );
    }

    const types = ["inquiry", "payment_failure", "subscription", "feedback"] as const;
    const results = await Promise.all(
      types.map(async (type) => {
        const result = await sendTestEmail(to, type);
        return { type, ...result };
      })
    );

    const allSuccess = results.every((r) => r.success);

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess
        ? `All test emails sent to ${to}`
        : "Some emails failed to send",
      results,
    });
  } catch (error) {
    console.error("[TEST-EMAIL] Error:", error);
    return NextResponse.json(
      { error: "Failed to send test emails" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

/**
 * IndexNow API endpoint for instant indexing on Bing, Yandex, Seznam, and Naver
 *
 * Usage: POST /api/indexnow with body { urls: ["https://example.com/page1", ...] }
 *
 * IndexNow is a protocol that allows websites to notify search engines about
 * URL changes instantly, rather than waiting for crawlers to discover them.
 *
 * Supported search engines:
 * - Bing (www.bing.com)
 * - Yandex (yandex.com)
 * - Seznam (seznam.cz)
 * - Naver (searchadvisor.naver.com)
 */

const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.com";
const SITE_HOST = new URL(SITE_URL).host;

// IndexNow endpoints - notifying one will share with all participating search engines
const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
];

export async function POST(request: NextRequest) {
  // Check for API key
  if (!INDEXNOW_KEY) {
    return NextResponse.json(
      { error: "IndexNow key not configured. Set INDEXNOW_KEY environment variable." },
      { status: 500 }
    );
  }

  // Verify authorization (simple API key check)
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.INTERNAL_API_KEY || INDEXNOW_KEY}`;

  if (authHeader !== expectedAuth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { urls } = body as { urls?: string[] };

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "urls array is required" },
        { status: 400 }
      );
    }

    // Validate URLs belong to our domain
    const validUrls = urls.filter((url) => {
      try {
        const parsed = new URL(url);
        return parsed.host === SITE_HOST;
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: "No valid URLs for this domain" },
        { status: 400 }
      );
    }

    // IndexNow allows up to 10,000 URLs per request
    const urlsToSubmit = validUrls.slice(0, 10000);

    // Submit to IndexNow (one submission shares with all participating engines)
    const payload = {
      host: SITE_HOST,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: urlsToSubmit,
    };

    const results = await Promise.allSettled(
      INDEXNOW_ENDPOINTS.map(async (endpoint) => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        return {
          endpoint,
          status: response.status,
          ok: response.ok,
        };
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok
    ).length;

    return NextResponse.json({
      success: true,
      message: `Submitted ${urlsToSubmit.length} URLs to IndexNow`,
      endpoints: results.map((r) =>
        r.status === "fulfilled" ? r.value : { error: String(r.reason) }
      ),
      successfulEndpoints: successful,
    });
  } catch (error) {
    console.error("IndexNow submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit to IndexNow" },
      { status: 500 }
    );
  }
}

// GET endpoint to check IndexNow configuration status
export async function GET() {
  if (!INDEXNOW_KEY) {
    return NextResponse.json({
      configured: false,
      message: "IndexNow key not set. Add INDEXNOW_KEY to your environment variables.",
      instructions: [
        "1. Generate a key (any 32-character hex string)",
        "2. Add INDEXNOW_KEY=your-key to .env.local",
        "3. Create public/[your-key].txt containing just the key",
      ],
    });
  }

  return NextResponse.json({
    configured: true,
    key: INDEXNOW_KEY,
    keyFileUrl: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    instructions: `Create a file at public/${INDEXNOW_KEY}.txt containing: ${INDEXNOW_KEY}`,
    usage: {
      method: "POST",
      headers: { Authorization: `Bearer ${INDEXNOW_KEY}` },
      body: { urls: ["https://www.findabatherapy.com/page1", "..."] },
    },
  });
}

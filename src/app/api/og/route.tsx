import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Find ABA Therapy";
  const subtitle =
    searchParams.get("subtitle") || "Discover trusted ABA therapy providers near you";
  const location = searchParams.get("location");

  // Build display title with location if provided
  const displayTitle = location ? `ABA Therapy in ${location}` : title;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(147, 51, 234, 0.15)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            left: -150,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(59, 130, 246, 0.1)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 200,
            left: 100,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(236, 72, 153, 0.1)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 80px",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          {/* Logo/Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 30,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 12,
                background: "linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "white",
              }}
            >
              Find ABA Therapy
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: location ? 64 : 56,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.1,
              margin: 0,
              marginBottom: 20,
              maxWidth: 900,
              textShadow: "0 2px 10px rgba(0,0,0,0.3)",
            }}
          >
            {displayTitle}
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 24,
              color: "rgba(255, 255, 255, 0.7)",
              margin: 0,
              maxWidth: 700,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>

          {/* Bottom tag */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 40,
              gap: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.1)",
                padding: "10px 20px",
                borderRadius: 50,
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 18,
              }}
            >
              500+ Providers
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.1)",
                padding: "10px 20px",
                borderRadius: 50,
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 18,
              }}
            >
              All 50 States
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.1)",
                padding: "10px 20px",
                borderRadius: 50,
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 18,
              }}
            >
              Free to Search
            </div>
          </div>
        </div>

        {/* URL at bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            display: "flex",
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: 18,
          }}
        >
          findabatherapy.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

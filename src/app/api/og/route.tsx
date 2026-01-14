import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get("brand") || "therapy";
  const isJobs = brand === "jobs";

  const title = searchParams.get("title") || (isJobs ? "Find ABA Jobs" : "Find ABA Therapy");
  const subtitle = searchParams.get("subtitle");
  const location = searchParams.get("location");
  const logo = searchParams.get("logo"); // Company logo URL
  const type = searchParams.get("type"); // job, employer, careers, provider

  // Build display title with location if provided
  const displayTitle = location
    ? (isJobs ? `ABA Jobs in ${location}` : `ABA Therapy in ${location}`)
    : title;

  // Default subtitle based on brand and type
  const getDefaultSubtitle = () => {
    if (subtitle) return subtitle;

    if (type === "job") return "View job details and apply now";
    if (type === "employer" || type === "careers") return "View open positions and company info";
    if (type === "provider") return "View services, locations, and contact info";

    return isJobs
      ? "Discover ABA therapy careers near you"
      : "Discover trusted ABA therapy providers near you";
  };

  // Get contextual stats based on type
  const getStats = () => {
    if (type === "job") return ["Apply Now", "Direct Hire", "Verified Employer"];
    if (type === "employer" || type === "careers") return ["Open Positions", "Company Profile", "Easy Apply"];
    if (type === "provider") return ["Verified Provider", "View Services", "Contact Info"];

    return isJobs
      ? ["1,000+ Jobs", "All 50 States", "Free to Apply"]
      : ["500+ Providers", "All 50 States", "Free to Search"];
  };

  // Brand-specific colors and settings
  const brandConfig = isJobs ? {
    gradient: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)",
    accentGradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    decorativeColor1: "rgba(16, 185, 129, 0.15)",
    decorativeColor2: "rgba(20, 184, 166, 0.1)",
    decorativeColor3: "rgba(52, 211, 153, 0.1)",
    brandName: "Find ABA Jobs",
    siteDomain: "findabajobs.org",
    icon: (
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
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  } : {
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
    accentGradient: "linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)",
    decorativeColor1: "rgba(147, 51, 234, 0.15)",
    decorativeColor2: "rgba(59, 130, 246, 0.1)",
    decorativeColor3: "rgba(236, 72, 153, 0.1)",
    brandName: "Find ABA Therapy",
    siteDomain: "findabatherapy.org",
    icon: (
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
    ),
  };

  const stats = getStats();
  const displaySubtitle = getDefaultSubtitle();

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
          background: brandConfig.gradient,
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
            background: brandConfig.decorativeColor1,
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
            background: brandConfig.decorativeColor2,
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
            background: brandConfig.decorativeColor3,
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
          {/* Logo/Brand - show company logo if provided, otherwise brand icon */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 30,
            }}
          >
            {logo ? (
              // Company logo with brand badge
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo}
                    alt=""
                    width={72}
                    height={72}
                    style={{ objectFit: "contain" }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.15)",
                    padding: "8px 16px",
                    borderRadius: 50,
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: brandConfig.accentGradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {isJobs ? (
                        <>
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                        </>
                      ) : (
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      )}
                    </svg>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "white" }}>
                    {brandConfig.brandName}
                  </span>
                </div>
              </div>
            ) : (
              // Default brand icon
              <>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 12,
                    background: brandConfig.accentGradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 16,
                  }}
                >
                  {brandConfig.icon}
                </div>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: "white",
                  }}
                >
                  {brandConfig.brandName}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: logo ? 48 : (location ? 64 : 56),
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
            {displaySubtitle}
          </p>

          {/* Bottom tags */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 40,
              gap: 24,
            }}
          >
            {stats.map((stat, index) => (
              <div
                key={index}
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
                {stat}
              </div>
            ))}
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
          {brandConfig.siteDomain}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

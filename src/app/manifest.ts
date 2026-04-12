import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GoodABA",
    short_name: "GoodABA",
    description:
      "GoodABA provider and family tools for intake, forms, agreements, and the client portal.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0866FF",
    orientation: "portrait-primary",
    scope: "/",
    categories: ["business", "medical", "productivity"],
    icons: [
      {
        src: "/brand/goodaba-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

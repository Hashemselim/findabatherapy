import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { PropsWithChildren } from "react";

import "./globals.css";
import { Providers } from "@/components/providers";
import { siteConfig } from "@/config/site";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

const title = `${siteConfig.name} | ${siteConfig.tagline}`;

export const metadata: Metadata = {
  title,
  description:
    "Search a nationwide directory of ABA therapy agencies offering in-home and center-based services. Compare plans, explore sponsored providers, and get connected quickly.",
  metadataBase: new URL("https://www.findabatherapy.com"),
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className="scroll-smooth bg-background antialiased">
      <body className={`${poppins.variable} min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

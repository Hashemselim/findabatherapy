import { Inter } from "next/font/google";
import { PropsWithChildren } from "react";

import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-poppins",
});

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className="scroll-smooth bg-background antialiased">
      <head />
      <body className={`${inter.variable} min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

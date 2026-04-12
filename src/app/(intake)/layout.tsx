import type { Metadata } from "next";
import { PropsWithChildren } from "react";

import { createGoodABALayoutMetadata } from "@/lib/seo/goodaba-metadata";

export const metadata: Metadata = createGoodABALayoutMetadata({
  defaultTitle: "GoodABA",
  description:
    "Secure GoodABA family and provider tools for forms, intake, agreements, and client portal access.",
});

export default function IntakeLayout({ children }: PropsWithChildren) {
  return <>{children}</>;
}

import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

import { createGoodABALayoutMetadata } from "@/lib/seo/goodaba-metadata";

export const metadata: Metadata = createGoodABALayoutMetadata({
  defaultTitle: "GoodABA",
});

export default function GoodABAInternalLayout({
  children,
}: PropsWithChildren) {
  return <>{children}</>;
}

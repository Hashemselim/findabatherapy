import type { Metadata } from "next";
import { PropsWithChildren } from "react";

import { createGoodABALayoutMetadata } from "@/lib/seo/goodaba-metadata";

export const metadata: Metadata = createGoodABALayoutMetadata({
  defaultTitle: "GoodABA",
});

export default function WebsiteRouteLayout({ children }: PropsWithChildren) {
  return <>{children}</>;
}

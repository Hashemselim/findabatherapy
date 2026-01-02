import { type PropsWithChildren } from "react";
import { type Metadata } from "next";

import { DemoLayoutClient } from "@/components/demo/demo-layout-client";

export const metadata: Metadata = {
  title: "Demo Dashboard | FindABATherapy",
  description:
    "Explore the Pro dashboard experience with sample data. See how you can manage your ABA therapy practice listing.",
  robots: "noindex, nofollow", // Don't index demo pages
};

export default function DemoLayout({ children }: PropsWithChildren) {
  return <DemoLayoutClient>{children}</DemoLayoutClient>;
}

import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = {
  title: {
    absolute: "GoodABA",
  },
};

export default function AuthRouteLayout({ children }: PropsWithChildren) {
  return <>{children}</>;
}

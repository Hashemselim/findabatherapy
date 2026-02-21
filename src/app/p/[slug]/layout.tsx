import type { PropsWithChildren } from "react";

/**
 * Branded agency page layout — no site header/footer.
 * Minimal passthrough; the page component handles its own branded background.
 */
export default function BrandedPageLayout({ children }: PropsWithChildren) {
  return <>{children}</>;
}

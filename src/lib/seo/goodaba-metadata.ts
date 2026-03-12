import type { Metadata } from "next";

export const GOODABA_BASE_URL = "https://www.goodaba.com";
export const GOODABA_NAME = "GoodABA";
export const GOODABA_TAGLINE = "Your complete ABA practice growth platform";
export const GOODABA_DESCRIPTION =
  "GoodABA is the all-in-one platform for ABA providers to grow their practice, manage inquiries, and recruit talent.";
export const GOODABA_OG_IMAGE = `${GOODABA_BASE_URL}/api/og?brand=goodaba&title=${encodeURIComponent(
  GOODABA_NAME
)}&subtitle=${encodeURIComponent(GOODABA_TAGLINE)}`;

type GoodABALayoutMetadataOptions = {
  defaultTitle?: string;
  description?: string;
};

export function createGoodABALayoutMetadata(
  options: GoodABALayoutMetadataOptions = {}
): Metadata {
  const defaultTitle = options.defaultTitle ?? GOODABA_NAME;
  const description = options.description ?? GOODABA_DESCRIPTION;

  return {
    metadataBase: new URL(GOODABA_BASE_URL),
    applicationName: GOODABA_NAME,
    title: {
      default: defaultTitle,
      template: "%s",
    },
    description,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: GOODABA_BASE_URL,
      siteName: GOODABA_NAME,
      title: defaultTitle,
      description,
      images: [
        {
          url: GOODABA_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: GOODABA_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@goodaba",
      creator: "@goodaba",
      title: defaultTitle,
      description,
      images: [GOODABA_OG_IMAGE],
    },
    other: {
      "theme-color": "#0866FF",
      "msapplication-TileColor": "#0866FF",
    },
  };
}

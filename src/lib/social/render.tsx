import { ImageResponse } from "next/og";
import { type SocialTemplate, type BrandData } from "./types";
import { LAYOUT_COMPONENTS } from "./layouts";

/**
 * Render a social post template as a PNG ImageResponse.
 */
export function renderSocialImage(
  template: SocialTemplate,
  brand: BrandData
): ImageResponse {
  const LayoutComponent = LAYOUT_COMPONENTS[template.layoutId];

  return new ImageResponse(
    (
      <LayoutComponent
        brand={brand}
        headline={template.layoutProps.headline}
        subline={template.layoutProps.subline}
        accent={template.layoutProps.accent}
      />
    ),
    {
      width: 1080,
      height: 1080,
    }
  );
}

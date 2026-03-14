function normalizeHexColor(hexColor: string): string {
  const normalized = hexColor.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(normalized)) {
    const [, r, g, b] = normalized;
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return "#000000";
}

function getPerceivedBrightness(hexColor: string): number {
  const normalized = normalizeHexColor(hexColor);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  return (r * 299 + g * 587 + b * 114) / 1000;
}

function hexChannelToLinear(channel: string): number {
  const srgb = parseInt(channel, 16) / 255;
  return srgb <= 0.04045
    ? srgb / 12.92
    : ((srgb + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(hexColor: string): number {
  const normalized = normalizeHexColor(hexColor);
  const r = hexChannelToLinear(normalized.slice(1, 3));
  const g = hexChannelToLinear(normalized.slice(3, 5));
  const b = hexChannelToLinear(normalized.slice(5, 7));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(colorA: string, colorB: string): number {
  const luminanceA = getRelativeLuminance(colorA);
  const luminanceB = getRelativeLuminance(colorB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);

  return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastingTextColor(
  backgroundColor: string,
  darkColor: string = "#000000",
  lightColor: string = "#FFFFFF"
): string {
  const darkContrast = getContrastRatio(backgroundColor, darkColor);
  const lightContrast = getContrastRatio(backgroundColor, lightColor);

  return darkContrast >= lightContrast ? darkColor : lightColor;
}

export function getSolidBrandButtonStyles(backgroundColor: string) {
  const normalized = normalizeHexColor(backgroundColor);
  const preferredTextColor = getPerceivedBrightness(normalized) >= 160 ? "#111827" : "#FFFFFF";

  return {
    backgroundColor: normalized,
    color: preferredTextColor,
  };
}

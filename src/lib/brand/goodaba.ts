const GOODABA_LOGO_PATH = "/brand/goodaba-logo.svg";
const GOODABA_LOGO_ALT = "GoodABA";
const GOODABA_LOGO_WIDTH = 1101;
const GOODABA_LOGO_HEIGHT = 279;

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export {
  GOODABA_LOGO_ALT,
  GOODABA_LOGO_HEIGHT,
  GOODABA_LOGO_PATH,
  GOODABA_LOGO_WIDTH,
};

export function getGoodABALogoUrl(baseUrl?: string): string {
  if (!baseUrl) {
    return GOODABA_LOGO_PATH;
  }

  return `${trimTrailingSlash(baseUrl)}${GOODABA_LOGO_PATH}`;
}

export function goodabaLogoHtml(options?: {
  alt?: string;
  backgroundColor?: string;
  baseUrl?: string;
  borderRadius?: number;
  height?: number;
  paddingX?: number;
  paddingY?: number;
}): string {
  const alt = options?.alt ?? GOODABA_LOGO_ALT;
  const height = options?.height ?? 28;
  const backgroundColor = options?.backgroundColor ?? "#ffffff";
  const borderRadius = options?.borderRadius ?? 12;
  const paddingX = options?.paddingX ?? 14;
  const paddingY = options?.paddingY ?? 8;
  const width = Math.round((height * GOODABA_LOGO_WIDTH) / GOODABA_LOGO_HEIGHT);

  return `<span style="display: inline-block; background-color: ${backgroundColor}; border-radius: ${borderRadius}px; padding: ${paddingY}px ${paddingX}px; line-height: 0;"><img src="${escapeHtml(getGoodABALogoUrl(options?.baseUrl))}" alt="${escapeHtml(alt)}" width="${width}" height="${height}" style="display: block; width: auto; height: ${height}px;"></span>`;
}

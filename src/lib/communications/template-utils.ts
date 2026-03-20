import {
  LINK_MERGE_FIELD_KEYS,
  MANUAL_MERGE_FIELD_KEYS,
  MERGE_FIELD_MAP,
} from "./merge-fields";
import sanitizeHtml from "sanitize-html";

const MERGE_FIELD_PATTERN = /\{([a-z0-9_]+)\}/gi;
const URL_PATTERN = /\bhttps?:\/\/[^\s<]+/gi;
const MAX_SIMPLE_TABLE_COLUMNS = 5;
const MAX_SIMPLE_TABLE_ROWS = 15;
const CANONICAL_CTA_TAG_PATTERN = /<fab-branded-cta\b([^>]*)><\/fab-branded-cta>/gi;
const CANONICAL_TABLE_TAG_PATTERN = /<fab-simple-table\b([^>]*)><\/fab-simple-table>/gi;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function normalizeLineBreaks(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function linkifyText(value: string): string {
  let lastIndex = 0;
  let html = "";

  for (const match of value.matchAll(URL_PATTERN)) {
    const rawUrl = match[0];
    const index = match.index ?? 0;

    html += escapeHtml(value.slice(lastIndex, index));

    const trailingMatch = rawUrl.match(/[),.;!?]+$/);
    const trailing = trailingMatch?.[0] || "";
    const cleanUrl = trailing ? rawUrl.slice(0, rawUrl.length - trailing.length) : rawUrl;

    html += `<a href="${escapeAttribute(cleanUrl)}" style="color:#0866FF;text-decoration:underline;">${escapeHtml(cleanUrl)}</a>`;
    if (trailing) {
      html += escapeHtml(trailing);
    }

    lastIndex = index + rawUrl.length;
  }

  html += escapeHtml(value.slice(lastIndex));

  return html;
}

function normalizeLinkedLineBreaks(value: string): string {
  return value
    .split("\n")
    .map((line) => linkifyText(line))
    .join("<br />");
}

export function linkifyRenderedHtmlText(html: string): string {
  let insideAnchor = false;

  return html
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (!part) return part;

      if (part.startsWith("<")) {
        if (/^<a\b/i.test(part)) {
          insideAnchor = true;
        } else if (/^<\/a>/i.test(part)) {
          insideAnchor = false;
        }

        return part;
      }

      if (insideAnchor) {
        return part;
      }

      return part.replace(URL_PATTERN, (rawUrl) => {
        const trailingMatch = rawUrl.match(/[),.;!?]+$/);
        const trailing = trailingMatch?.[0] || "";
        const cleanUrl = trailing
          ? rawUrl.slice(0, rawUrl.length - trailing.length)
          : rawUrl;

        return `<a href="${escapeAttribute(cleanUrl)}" style="color:#0866FF;text-decoration:underline;">${escapeHtml(cleanUrl)}</a>${trailing}`;
      });
    })
    .join("");
}

function buildEmailButton(label: string, href: string): string {
  return `<a href="${escapeAttribute(href)}" target="_blank" style="display:inline-block;padding:12px 18px;border:1px solid #0866FF;border-radius:999px;background-color:#0866FF;color:#ffffff;font-size:14px;font-weight:700;line-height:1.2;text-decoration:none;">${escapeHtml(label)}</a>`;
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseTagAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of source.matchAll(/([a-z0-9:-]+)=("([^"]*)"|'([^']*)')/gi)) {
    const key = match[1];
    const rawValue = match[3] ?? match[4] ?? "";
    attributes[key] = decodeHtmlAttribute(rawValue);
  }
  return attributes;
}

export function formatBrandedLinkLabel(label: string): string {
  return label.replace(/\s+Link$/i, "").trim();
}

function buildRowsTable(rows: Array<[string, string]>): string {
  const cells = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 12px;border:1px solid #dbe4ee;background:#f8fafc;font-weight:600;width:38%;">${normalizeLineBreaks(label)}</td>
          <td style="padding:10px 12px;border:1px solid #dbe4ee;">${normalizeLinkedLineBreaks(value)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <table data-email-block="rows-table" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;width:100%;margin:16px 0;border-radius:12px;overflow:hidden;">
      <tbody>${cells}</tbody>
    </table>
  `.trim();
}

export type BrandedLinkMode = "inline" | "card";

export interface BrandedLinkSnippetParams {
  fieldKey: string;
  label: string;
  mode: BrandedLinkMode;
  description?: string;
}

export interface SimpleTableInput {
  headers: string[];
  rows: string[][];
  includeHeader?: boolean;
}

export interface RowBlockInput {
  rows: Array<{ label: string; value: string }>;
}

export function extractMergeFields(content: string): string[] {
  const fields = new Set<string>();
  for (const match of content.matchAll(MERGE_FIELD_PATTERN)) {
    const key = match[1]?.trim();
    if (key) {
      fields.add(key);
    }
  }

  return Array.from(fields);
}

export function extractMergeFieldsFromTemplate(params: {
  subject: string;
  body: string;
  cc?: string[];
}): string[] {
  const fields = new Set<string>();
  for (const value of [params.subject, params.body, ...(params.cc || [])]) {
    for (const key of extractMergeFields(value)) {
      fields.add(key);
    }
  }
  return Array.from(fields).sort();
}

export function renderTemplateWithValues(
  content: string,
  values: Record<string, string>,
  options?: { preserveMissing?: boolean }
): string {
  return content.replace(MERGE_FIELD_PATTERN, (match, rawKey: string) => {
    const key = rawKey.trim();
    const value = values[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }

    return options?.preserveMissing ? match : "";
  });
}

export function renderHtmlTemplateWithValues(
  content: string,
  values: Record<string, string>,
  options?: { preserveMissing?: boolean }
): string {
  return content.replace(MERGE_FIELD_PATTERN, (match, rawKey: string) => {
    const key = rawKey.trim();
    const value = values[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return escapeHtml(value);
    }

    return options?.preserveMissing ? match : "";
  });
}

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "a",
      "b",
      "blockquote",
      "br",
      "div",
      "em",
      "h1",
      "h2",
      "h3",
      "hr",
      "img",
      "li",
      "ol",
      "p",
      "span",
      "strong",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel", "style"],
      div: ["align", "style"],
      h1: ["align", "style"],
      h2: ["align", "style"],
      h3: ["align", "style"],
      img: ["alt", "height", "src", "style", "width"],
      ol: ["style"],
      p: ["align", "style"],
      span: ["style"],
      table: ["border", "cellpadding", "cellspacing", "role", "style", "width"],
      tbody: ["style"],
      td: ["align", "colspan", "rowspan", "style", "valign", "width"],
      th: ["align", "colspan", "rowspan", "style", "valign", "width"],
      thead: ["style"],
      tr: ["align", "style", "valign"],
      ul: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
    parseStyleAttributes: false,
    transformTags: {
      a: (tagName: string, attribs: Record<string, string>) => {
        const href = attribs.href?.trim();
        if (!href) {
          const { target: _target, rel: _rel, ...rest } = attribs;
          return { tagName, attribs: rest };
        }

        return {
          tagName,
          attribs: {
            ...attribs,
            href,
            rel: "noopener noreferrer nofollow",
            target: attribs.target || "_blank",
          },
        };
      },
    },
  });
}

export function getUnresolvedMergeFields(params: {
  subject: string;
  body: string;
  cc?: string[];
  values: Record<string, string>;
  manualValues?: Record<string, string>;
}): string[] {
  const fields = extractMergeFieldsFromTemplate(params);
  const unresolved = new Set<string>();

  for (const field of fields) {
    const resolvedValue = params.values[field]?.trim();
    const manualValue = params.manualValues?.[field]?.trim();

    if (MANUAL_MERGE_FIELD_KEYS.includes(field)) {
      if (!manualValue) {
        unresolved.add(field);
      }
      continue;
    }

    if (!resolvedValue) {
      unresolved.add(field);
    }
  }

  return Array.from(unresolved).sort();
}

export function getMissingDynamicLinkKeys(values: Record<string, string>): string[] {
  return LINK_MERGE_FIELD_KEYS.filter((field) => !values[field]?.trim());
}

export function buildBrandedLinkSnippet({
  fieldKey,
  label,
  mode,
  description,
}: BrandedLinkSnippetParams): string {
  const href = `{${fieldKey}}`;
  const baseLabel = formatBrandedLinkLabel(label);

  if (mode === "inline") {
    return `<a href="${escapeAttribute(href)}" style="color:#0866FF;text-decoration:underline;">${escapeHtml(baseLabel)}</a>`;
  }

  const ctaLabel = `Open ${baseLabel}`;
  const button = buildEmailButton(ctaLabel, href);
  const supportingText = description?.trim()
    ? `<span style="margin-left:12px;color:#475569;font-size:13px;line-height:1.5;vertical-align:middle;">${escapeHtml(description.trim())}</span>`
    : "";

  return `<p data-email-block="branded-card" style="margin:16px 0;">${button}${supportingText}</p>`;
}

export function renderCanonicalEmailBlocks(html: string): string {
  if (!html.trim()) {
    return html;
  }

  const withCtas = html.replace(CANONICAL_CTA_TAG_PATTERN, (_match, attrSource: string) => {
    const attrs = parseTagAttributes(attrSource);
    return buildBrandedLinkSnippet({
      fieldKey: attrs["data-field-key"] || "contact_link",
      label: attrs["data-label"] || "Contact Form Link",
      mode: "card",
      description: attrs["data-description"] || "",
    });
  });

  return withCtas.replace(CANONICAL_TABLE_TAG_PATTERN, (_match, attrSource: string) => {
    const attrs = parseTagAttributes(attrSource);
    const includeHeader =
      attrs["data-include-header"] !== "false";
    let headers: string[] = [];
    let rows: string[][] = [];

    try {
      const payload = JSON.parse(attrs["data-table-payload"] || "{}") as {
        headers?: string[];
        rows?: string[][];
        includeHeader?: boolean;
      };
      headers = Array.isArray(payload.headers) ? payload.headers : [];
      rows = Array.isArray(payload.rows) ? payload.rows : [];
      if (typeof payload.includeHeader === "boolean") {
        return buildSimpleTableHtml({
          headers,
          rows,
          includeHeader: payload.includeHeader,
        });
      }
    } catch {
      // Fall back to attr-derived defaults below.
    }

    return buildSimpleTableHtml({
      headers,
      rows,
      includeHeader,
    });
  });
}

export function buildSimpleTableHtml({
  headers,
  rows,
  includeHeader = true,
}: SimpleTableInput): string {
  const normalizedHeaders = headers.slice(0, MAX_SIMPLE_TABLE_COLUMNS);
  const normalizedRows = rows.slice(0, MAX_SIMPLE_TABLE_ROWS).map((row) =>
    row.slice(0, MAX_SIMPLE_TABLE_COLUMNS)
  );

  const headerHtml =
    includeHeader && normalizedHeaders.length > 0
      ? `<thead><tr>${normalizedHeaders
          .map(
            (header) =>
              `<th style="padding:10px 12px;border:1px solid #dbe4ee;background:#eff6ff;color:#0f172a;text-align:left;font-size:12px;font-weight:700;">${normalizeLineBreaks(header)}</th>`
          )
          .join("")}</tr></thead>`
      : "";

  const bodyHtml = normalizedRows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="padding:10px 12px;border:1px solid #dbe4ee;vertical-align:top;">${normalizeLinkedLineBreaks(cell)}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  return `
    <table data-email-block="simple-table" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:16px 0;border-collapse:collapse;">
      ${headerHtml}
      <tbody>${bodyHtml}</tbody>
    </table>
  `.trim();
}

export function buildAppointmentDetailsHtml(input: RowBlockInput): string {
  return buildRowsTable(
    input.rows
      .filter((row) => row.label.trim() || row.value.trim())
      .map((row) => [row.label, row.value])
  );
}

export function buildInsuranceDetailsHtml(input: RowBlockInput): string {
  return buildRowsTable(
    input.rows
      .filter((row) => row.label.trim() || row.value.trim())
      .map((row) => [row.label, row.value])
  );
}

export function buildActionItemsHtml(items: string[]): string {
  const rows = items
    .filter((item) => item.trim())
    .map(
      (item) => `
        <tr>
          <td style="padding:0 0 10px 0;vertical-align:top;width:22px;">
            <span style="display:inline-block;width:14px;height:14px;border:1px solid #94a3b8;border-radius:4px;background:#ffffff;"></span>
          </td>
          <td style="padding:0 0 10px 0;color:#0f172a;">${normalizeLinkedLineBreaks(item)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <table data-email-block="action-items" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:16px 0;border-collapse:collapse;">
      <tbody>${rows}</tbody>
    </table>
  `.trim();
}

export function buildResourcesListHtml(
  items: Array<{ title: string; url: string; description?: string }>
): string {
  const rows = items
    .filter((item) => item.title.trim() && item.url.trim())
    .map((item) => {
      const description = item.description?.trim()
        ? `<p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:#475569;">${escapeHtml(item.description)}</p>`
        : "";

      return `
        <tr>
          <td style="padding:14px 16px;border:1px solid #dbe4ee;border-radius:12px;background:#ffffff;">
            <a href="${escapeAttribute(item.url)}" style="font-size:14px;font-weight:600;color:#0866FF;text-decoration:none;">${escapeHtml(item.title)}</a>
            ${description}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table data-email-block="resources-list" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:16px 0;border-collapse:separate;border-spacing:0 10px;">
      <tbody>${rows}</tbody>
    </table>
  `.trim();
}

export function getMergeFieldLabel(fieldKey: string): string {
  return MERGE_FIELD_MAP[fieldKey]?.label || fieldKey;
}

export function isManualMergeField(fieldKey: string): boolean {
  return MANUAL_MERGE_FIELD_KEYS.includes(fieldKey);
}

export function isLinkMergeField(fieldKey: string): boolean {
  return LINK_MERGE_FIELD_KEYS.includes(fieldKey);
}

export function getSimpleTableLimits() {
  return {
    maxColumns: MAX_SIMPLE_TABLE_COLUMNS,
    maxRows: MAX_SIMPLE_TABLE_ROWS,
  };
}

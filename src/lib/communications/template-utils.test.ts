import { describe, expect, it } from "vitest";

import {
  buildBrandedLinkSnippet,
  buildSimpleTableHtml,
  extractMergeFieldsFromTemplate,
  formatBrandedLinkLabel,
  getUnresolvedMergeFields,
  linkifyRenderedHtmlText,
  renderCanonicalEmailBlocks,
  renderHtmlTemplateWithValues,
  renderTemplateWithValues,
  sanitizeEmailHtml,
} from "./template-utils";

describe("extractMergeFieldsFromTemplate", () => {
  it("collects merge fields from subject, body, and cc", () => {
    expect(
      extractMergeFieldsFromTemplate({
        subject: "Hello {parent_first_name}",
        body: '<p>View {agreement_link} for {client_name}</p>',
        cc: ["{agency_email}"],
      })
    ).toEqual([
      "agency_email",
      "agreement_link",
      "client_name",
      "parent_first_name",
    ]);
  });
});

describe("renderTemplateWithValues", () => {
  it("preserves unresolved placeholders when requested", () => {
    expect(
      renderTemplateWithValues("Hi {parent_name}, {agreement_link}", {
        parent_name: "Alex",
        agreement_link: "",
      }, { preserveMissing: true })
    ).toBe("Hi Alex, {agreement_link}");
  });
});

describe("renderHtmlTemplateWithValues", () => {
  it("escapes merge values in text and attribute contexts", () => {
    expect(
      renderHtmlTemplateWithValues(
        '<p>Hello {parent_name}</p><a href="{agreement_link}">Review</a>',
        {
          parent_name: 'Alex & "<Taylor>"',
          agreement_link: 'https://example.com/?x="1"&y=2',
        }
      )
    ).toBe(
      '<p>Hello Alex &amp; &quot;&lt;Taylor&gt;&quot;</p><a href="https://example.com/?x=&quot;1&quot;&amp;y=2">Review</a>'
    );
  });
});

describe("linkifyRenderedHtmlText", () => {
  it("turns plain rendered URLs in html text nodes into anchors", () => {
    expect(
      linkifyRenderedHtmlText(
        "<table><tbody><tr><td>https://example.com/start</td></tr></tbody></table>"
      )
    ).toContain(
      '<td><a href="https://example.com/start" style="color:#0866FF;text-decoration:underline;">https://example.com/start</a></td>'
    );
  });
});

describe("getUnresolvedMergeFields", () => {
  it("flags empty automatic and manual fields", () => {
    expect(
      getUnresolvedMergeFields({
        subject: "Update for {client_name}",
        body: "<p>{assessment_date} {agreement_link}</p>",
        values: {
          client_name: "Jordan",
          agreement_link: "",
          assessment_date: "",
        },
        manualValues: {},
      })
    ).toEqual(["agreement_link", "assessment_date"]);
  });

  it("clears fields once manual and automatic values are available", () => {
    expect(
      getUnresolvedMergeFields({
        subject: "Update for {client_name}",
        body: "<p>{assessment_date} {intake_link}</p>",
        values: {
          client_name: "Jordan",
          intake_link: "https://example.com/intake",
          assessment_date: "",
        },
        manualValues: {
          assessment_date: "April 10",
        },
      })
    ).toEqual([]);
  });
});

describe("buildSimpleTableHtml", () => {
  it("enforces row and column limits", () => {
    const html = buildSimpleTableHtml({
      headers: ["A", "B", "C", "D", "E", "F"],
      rows: new Array(20).fill(null).map(() => ["1", "2", "3", "4", "5", "6"]),
      includeHeader: true,
    });

    expect((html.match(/<th /g) || []).length).toBe(5);
    expect((html.match(/<tr/g) || []).length).toBe(16);
  });

  it("renders URL cells as clickable links", () => {
    const html = buildSimpleTableHtml({
      headers: ["Resource", "URL"],
      rows: [["Portal", "https://example.com/start"]],
      includeHeader: true,
    });

    expect(html).toContain('<a href="https://example.com/start"');
    expect(html).toContain(">https://example.com/start</a>");
  });
});

describe("buildBrandedLinkSnippet", () => {
  it("renders CTA cards as compact button links with cleaned labels", () => {
    const html = buildBrandedLinkSnippet({
      fieldKey: "contact_link",
      label: "Contact Form",
      mode: "card",
      description: "Reach our team directly",
    });

    expect(html).toContain('data-email-block="branded-card"');
    expect(html).toContain('background-color:#0866FF');
    expect(html).toContain(">Open Contact Form</a>");
    expect(html).not.toContain("<table");
  });
});

describe("renderCanonicalEmailBlocks", () => {
  it("renders canonical CTA tags into branded button html", () => {
    const html = renderCanonicalEmailBlocks(
      '<fab-branded-cta data-field-key="contact_link" data-label="Contact Form Link"></fab-branded-cta>'
    );

    expect(html).toContain('data-email-block="branded-card"');
    expect(html).toContain('background-color:#0866FF');
    expect(html).toContain('href="{contact_link}"');
    expect(html).toContain(">Open Contact Form</a>");
  });

  it("renders canonical simple table tags into email-safe tables", () => {
    const payload = JSON.stringify({
      headers: ["Resource", "Link"],
      rows: [["Portal", "https://example.com"]],
      includeHeader: true,
    }).replace(/"/g, "&quot;");

    const html = renderCanonicalEmailBlocks(
      `<fab-simple-table data-table-kind="simple" data-table-payload="${payload}"></fab-simple-table>`
    );

    expect(html).toContain('data-email-block="simple-table"');
    expect(html).toContain("<table");
    expect(html).toContain('<a href="https://example.com"');
  });
});

describe("formatBrandedLinkLabel", () => {
  it("removes the trailing link suffix for display labels", () => {
    expect(formatBrandedLinkLabel("Contact Form Link")).toBe("Contact Form");
  });
});

describe("sanitizeEmailHtml", () => {
  it("removes unsafe handlers and editor-only metadata while preserving styles", () => {
    const sanitized = sanitizeEmailHtml(
      '<p class="editor" data-merge-field="client_name" style="color:#0866FF" onclick="alert(1)">Hi</p><a href="javascript:alert(1)" data-table-payload="{&quot;x&quot;:1}">Open</a>'
    );

    expect(sanitized).toContain('<p style="color:#0866FF">Hi</p>');
    expect(sanitized).toContain(">Open</a>");
    expect(sanitized).not.toContain("class=");
    expect(sanitized).not.toContain("data-merge-field=");
    expect(sanitized).not.toContain("data-table-payload=");
    expect(sanitized).not.toContain("javascript:");
  });

  it("removes unquoted event handlers and unsafe sources", () => {
    const sanitized = sanitizeEmailHtml(
      '<img src=x onerror=alert(1)><a href=https://example.com onclick=alert(1)>Open</a>'
    );

    expect(sanitized).toContain("<img");
    expect(sanitized).toContain('src="x"');
    expect(sanitized).toContain('href="https://example.com"');
    expect(sanitized).not.toContain("onerror=");
    expect(sanitized).not.toContain("onclick=");
  });
});

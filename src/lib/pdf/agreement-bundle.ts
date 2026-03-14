import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from "pdf-lib";

interface AgreementBundleDocument {
  name: string;
  label: string | null;
  description?: string | null;
  sha256: string;
  acknowledgedAt: string;
  bytes: Uint8Array;
}

interface CreateAgreementBundlePdfInput {
  providerName: string;
  packetTitle: string;
  packetDescription: string | null;
  clientName: string;
  signerName: string;
  signedAt: string;
  linkType: "generic" | "assigned";
  ipAddress: string | null;
  userAgent: string | null;
  signaturePngBytes: Uint8Array;
  documents: AgreementBundleDocument[];
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 56;
const TOP_Y = 736;
function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function drawWrappedText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
  color = rgb(0.16, 0.18, 0.2),
  lineHeight = size + 4,
  maxChars = 90
) {
  let currentY = y;
  for (const line of wrapText(text, maxChars)) {
    page.drawText(line, { x, y: currentY, size, font, color });
    currentY -= lineHeight;
  }
  return currentY;
}

function formatMaybe(value: string | null) {
  return value?.trim() ? value.trim() : "Not captured";
}

export async function createAgreementBundlePdf(
  input: CreateAgreementBundlePdfInput
) {
  const pdfDoc = await PDFDocument.create();
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const signatureImage = await pdfDoc.embedPng(input.signaturePngBytes);

  const summaryPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = TOP_Y;

  summaryPage.drawText("Signed Agreement Form", {
    x: MARGIN_X,
    y,
    size: 22,
    font: titleFont,
    color: rgb(0.06, 0.18, 0.42),
  });
  y -= 30;

  summaryPage.drawText(input.packetTitle, {
    x: MARGIN_X,
    y,
    size: 16,
    font: titleFont,
    color: rgb(0.11, 0.12, 0.14),
  });
  y -= 24;

  y = drawWrappedText(
    summaryPage,
    bodyFont,
    `Provider: ${input.providerName}`,
    MARGIN_X,
    y,
    11
  );
  y = drawWrappedText(
    summaryPage,
    bodyFont,
    `Client: ${input.clientName}`,
    MARGIN_X,
    y,
    11
  );
  y = drawWrappedText(
    summaryPage,
    bodyFont,
    `Signer: ${input.signerName}`,
    MARGIN_X,
    y,
    11
  );
  y = drawWrappedText(
    summaryPage,
    bodyFont,
    `Signed at: ${input.signedAt}`,
    MARGIN_X,
    y,
    11
  );
  y = drawWrappedText(
    summaryPage,
    bodyFont,
    `Link type: ${input.linkType}`,
    MARGIN_X,
    y,
    11
  );
  y -= 8;

  if (input.packetDescription) {
    summaryPage.drawText("Packet Description", {
      x: MARGIN_X,
      y,
      size: 12,
      font: titleFont,
      color: rgb(0.11, 0.12, 0.14),
    });
    y -= 18;
    y = drawWrappedText(
      summaryPage,
      bodyFont,
      input.packetDescription,
      MARGIN_X,
      y,
      10,
      rgb(0.27, 0.31, 0.36),
      14,
      96
    );
    y -= 8;
  }

  summaryPage.drawText("Acknowledged Documents", {
    x: MARGIN_X,
    y,
    size: 12,
    font: titleFont,
    color: rgb(0.11, 0.12, 0.14),
  });
  y -= 18;

  for (const [index, document] of input.documents.entries()) {
    y = drawWrappedText(
      summaryPage,
      bodyFont,
      `${index + 1}. ${document.label || document.name}`,
      MARGIN_X,
      y,
      10
    );
    if (document.description) {
      y = drawWrappedText(
        summaryPage,
        bodyFont,
        document.description,
        MARGIN_X + 14,
        y,
        8,
        rgb(0.38, 0.41, 0.46),
        12,
        92
      );
    }
    y = drawWrappedText(
      summaryPage,
      bodyFont,
      `Acknowledged: ${document.acknowledgedAt} | SHA-256: ${document.sha256}`,
      MARGIN_X + 14,
      y,
      8,
      rgb(0.38, 0.41, 0.46),
      12,
      92
    );
    y -= 2;
  }

  y -= 10;
  summaryPage.drawText("Electronic Signature", {
    x: MARGIN_X,
    y,
    size: 12,
    font: titleFont,
    color: rgb(0.11, 0.12, 0.14),
  });
  y -= 84;

  summaryPage.drawRectangle({
    x: MARGIN_X,
    y,
    width: 220,
    height: 72,
    borderWidth: 1,
    borderColor: rgb(0.83, 0.86, 0.9),
    color: rgb(0.98, 0.99, 1),
  });
  summaryPage.drawImage(signatureImage, {
    x: MARGIN_X + 10,
    y: y + 10,
    width: 200,
    height: 52,
  });

  drawWrappedText(
    summaryPage,
    bodyFont,
    `IP address: ${formatMaybe(input.ipAddress)}`,
    MARGIN_X + 250,
    y + 56,
    9,
    rgb(0.27, 0.31, 0.36),
    13,
    38
  );
  drawWrappedText(
    summaryPage,
    bodyFont,
    `User agent: ${formatMaybe(input.userAgent)}`,
    MARGIN_X + 250,
    y + 30,
    9,
    rgb(0.27, 0.31, 0.36),
    13,
    38
  );

  const appendixPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let appendixY = TOP_Y;
  appendixPage.drawText("Included Source Documents", {
    x: MARGIN_X,
    y: appendixY,
    size: 18,
    font: titleFont,
    color: rgb(0.06, 0.18, 0.42),
  });
  appendixY -= 28;

  for (const [index, document] of input.documents.entries()) {
    appendixY = drawWrappedText(
      appendixPage,
      bodyFont,
      `${index + 1}. ${document.label || document.name}`,
      MARGIN_X,
      appendixY,
      11
    );
    if (document.description) {
      appendixY = drawWrappedText(
        appendixPage,
        bodyFont,
        document.description,
        MARGIN_X + 14,
        appendixY,
        9,
        rgb(0.38, 0.41, 0.46),
        13,
        80
      );
    }
    appendixY = drawWrappedText(
      appendixPage,
      bodyFont,
      `Original file: ${document.name}`,
      MARGIN_X + 14,
      appendixY,
      9,
      rgb(0.38, 0.41, 0.46),
      13,
      80
    );
    appendixY -= 6;
  }

  for (const document of input.documents) {
    const sourcePdf = await PDFDocument.load(document.bytes);
    const copiedPages = await pdfDoc.copyPages(sourcePdf, sourcePdf.getPageIndices());
    for (const page of copiedPages) {
      pdfDoc.addPage(page);
    }
  }

  return await pdfDoc.save();
}

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Turnstile from "react-turnstile";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import type { AgreementPublicPageData } from "@/lib/actions/agreements";
import { submitAgreementPacket } from "@/lib/actions/agreements";
import { SignaturePad } from "@/components/forms/signature-pad";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSolidBrandButtonStyles } from "@/lib/utils/brand-color";
import { cn } from "@/lib/utils";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface AgreementSigningFormProps {
  packet: AgreementPublicPageData["packet"];
  link: AgreementPublicPageData["link"];
  providerName: string;
  brandColor: string;
  disabled?: boolean;
}

function RequiredLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
      <span>{children}</span>
      <span className="text-sm font-semibold text-destructive">*</span>
    </Label>
  );
}

function RequiredInlineText({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span>{children}</span>
      <span className="ml-1 text-sm font-semibold text-destructive">*</span>
    </>
  );
}

function DocumentPreviewFrame({
  title,
  sourceUrl,
}: {
  title: string;
  sourceUrl: string;
}) {
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadPreview = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          throw new Error("Preview request failed");
        }

        const bytes = await response.arrayBuffer();
        const pdf = await getDocument({ data: bytes }).promise;
        const nextImages: string[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.2 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Canvas not available");
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
          }).promise;

          const imageUrl = canvas.toDataURL("image/png");
          nextImages.push(imageUrl);
          page.cleanup();
        }

        if (isMounted) {
          setPageImages(nextImages);
          setLoadFailed(false);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setPageImages([]);
          setLoadFailed(true);
          setIsLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [sourceUrl]);

  if (loadFailed) {
    return (
      <div className="flex h-[360px] items-center justify-center bg-white px-6 text-center text-sm text-muted-foreground">
        Preview unavailable here. Use the Open PDF button above.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[360px] items-center justify-center bg-white text-sm text-muted-foreground">
        Loading preview...
      </div>
    );
  }

  return (
    <div
      aria-label={title}
      className="max-h-[420px] space-y-3 overflow-y-auto bg-muted/20 p-3"
    >
      {pageImages.map((image, index) => (
        <Image
          key={`${title}-${index + 1}`}
          src={image}
          alt={`${title} page ${index + 1}`}
          width={900}
          height={1200}
          unoptimized
          className="h-auto w-full rounded-lg border border-border/60 bg-white shadow-xs"
        />
      ))}
    </div>
  );
}

export function AgreementSigningForm({
  packet,
  link,
  providerName,
  brandColor,
  disabled = false,
}: AgreementSigningFormProps) {
  const validationTimerRef = useRef<number | null>(null);
  const brandButtonStyles = getSolidBrandButtonStyles(brandColor);
  const [clientName, setClientName] = useState(link.clientNamePrefill || "");
  const [signerFirstName, setSignerFirstName] = useState("");
  const [signerLastName, setSignerLastName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [electronicRecordsConsent, setElectronicRecordsConsent] = useState(false);
  const [electronicSignatureConsent, setElectronicSignatureConsent] = useState(false);
  const [authorityConfirmed, setAuthorityConfirmed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [documentChecks, setDocumentChecks] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isValidatingSubmit, setIsValidatingSubmit] = useState(false);

  const allDocumentsChecked = useMemo(
    () => packet.documents.every((document) => documentChecks[document.id]),
    [packet.documents, documentChecks]
  );
  const clientNameMissing = submitAttempted && !clientName.trim();
  const signerFirstNameMissing = submitAttempted && !signerFirstName.trim();
  const signerLastNameMissing = submitAttempted && !signerLastName.trim();
  const signatureMissing = submitAttempted && !signatureDataUrl;
  const recordsConsentMissing = submitAttempted && !electronicRecordsConsent;
  const signatureConsentMissing = submitAttempted && !electronicSignatureConsent;
  const authorityMissing = submitAttempted && !authorityConfirmed;
  const turnstileMissing = submitAttempted && !turnstileToken;
  const hasValidationIssues =
    !allDocumentsChecked ||
    !clientName.trim() ||
    !signerFirstName.trim() ||
    !signerLastName.trim() ||
    !signatureDataUrl ||
    !electronicRecordsConsent ||
    !electronicSignatureConsent ||
    !authorityConfirmed ||
    !turnstileToken;
  const submitSummaryMessage = error
    ? error
    : submitAttempted && hasValidationIssues
      ? turnstileMissing
        ? "Complete the security verification, then submit again."
        : "Please complete the highlighted required fields and confirmations above."
      : null;

  useEffect(() => {
    return () => {
      if (validationTimerRef.current) {
        window.clearTimeout(validationTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = () => {
    setError(null);
    setSubmitAttempted(true);
    setIsValidatingSubmit(true);

    if (validationTimerRef.current) {
      window.clearTimeout(validationTimerRef.current);
    }
    validationTimerRef.current = window.setTimeout(() => {
      setIsValidatingSubmit(false);
      validationTimerRef.current = null;
    }, 450);

    if (disabled) {
      return;
    }

    if (!allDocumentsChecked) {
      setError("Please acknowledge every document before signing.");
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the security verification.");
      return;
    }

    startTransition(async () => {
      setIsValidatingSubmit(false);
      const result = await submitAgreementPacket({
        turnstileToken,
        payload: {
          packet_id: packet.id,
          packet_version_id: packet.versionId,
          link_token: link.token || "",
          client_name: clientName,
          signer_first_name: signerFirstName,
          signer_last_name: signerLastName,
          signature_data_url: signatureDataUrl,
          consent_to_electronic_records: electronicRecordsConsent,
          consent_to_sign_electronically: electronicSignatureConsent,
          signer_authority_confirmed: authorityConfirmed,
          documents: packet.documents.map((document) => ({
            packet_version_document_id: document.id,
            acknowledged: Boolean(documentChecks[document.id]),
          })),
        },
      });

      if (!result.success) {
        setError(result.error || "Failed to submit agreement form.");
        return;
      }

      setSuccess(true);
    });
  };

  if (success) {
    return (
      <div className="py-8 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
        <h3 className="mt-4 text-xl font-semibold">Agreement Received</h3>
        <p className="mt-2 text-muted-foreground">
          {providerName} now has your signed agreement.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${disabled ? "pointer-events-none select-none opacity-60" : ""}`}>
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Documents</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Open each document, review it, and confirm that you agree before signing.
          </p>
        </div>

        {packet.documents.map((document, index) => (
          <div key={document.id} className="rounded-2xl border border-border/60 bg-muted/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {index + 1}. {document.label || document.fileName}
                </p>
                {document.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{document.description}</p>
                ) : null}
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={document.previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open PDF
                </a>
              </Button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
              <DocumentPreviewFrame
                title={document.label || document.fileName}
                sourceUrl={document.previewUrl}
              />
            </div>

            <div
              className={cn(
                "mt-4 rounded-xl border bg-white p-3",
                submitAttempted && !documentChecks[document.id]
                  ? "border-destructive bg-destructive/5"
                  : "border-border/60"
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`doc-${document.id}`}
                  checked={Boolean(documentChecks[document.id])}
                  onCheckedChange={(checked) =>
                    setDocumentChecks((current) => ({
                      ...current,
                      [document.id]: Boolean(checked),
                    }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor={`doc-${document.id}`} className="cursor-pointer text-sm leading-6">
                    <RequiredInlineText>
                      I have read and agreed to the contents of this document.
                    </RequiredInlineText>
                  </Label>
                  {submitAttempted && !documentChecks[document.id] ? (
                    <p className="text-xs font-medium text-destructive">Please check this box.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <RequiredLabel htmlFor="client-name">Client Name</RequiredLabel>
          <Input
            id="client-name"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            placeholder="Client / child name"
            className={clientNameMissing ? "border-destructive focus-visible:ring-destructive/20" : ""}
            aria-invalid={clientNameMissing}
          />
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="signer-first-name">Signer First Name</RequiredLabel>
          <Input
            id="signer-first-name"
            value={signerFirstName}
            onChange={(event) => setSignerFirstName(event.target.value)}
            placeholder="Parent or guardian first name"
            className={signerFirstNameMissing ? "border-destructive focus-visible:ring-destructive/20" : ""}
            aria-invalid={signerFirstNameMissing}
          />
        </div>
        <div className="space-y-2">
          <RequiredLabel htmlFor="signer-last-name">Signer Last Name</RequiredLabel>
          <Input
            id="signer-last-name"
            value={signerLastName}
            onChange={(event) => setSignerLastName(event.target.value)}
            placeholder="Parent or guardian last name"
            className={signerLastNameMissing ? "border-destructive focus-visible:ring-destructive/20" : ""}
            aria-invalid={signerLastNameMissing}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold">
            Signature <span className="text-destructive">*</span>
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Draw your signature to complete this agreement.
          </p>
        </div>
        <div className={cn(signatureMissing ? "rounded-2xl border border-destructive bg-destructive/5 p-2" : "")}>
          <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} disabled={disabled} />
        </div>
        {signatureMissing ? (
          <p className="text-sm text-destructive">Signature is required.</p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/10 p-4">
        <p className="text-sm font-medium">
          Final Attestations <span className="text-destructive">*</span>
        </p>
        <div
          className={cn(
            "rounded-xl border bg-white p-3",
            recordsConsentMissing ? "border-destructive bg-destructive/5" : "border-border/60"
          )}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id="electronic-records"
              checked={electronicRecordsConsent}
              onCheckedChange={(checked) => setElectronicRecordsConsent(Boolean(checked))}
            />
            <div className="space-y-1">
              <Label htmlFor="electronic-records" className="cursor-pointer text-sm leading-6">
                <RequiredInlineText>
                  I consent to receive and retain these records electronically.
                </RequiredInlineText>
              </Label>
              {recordsConsentMissing ? (
                <p className="text-xs font-medium text-destructive">This confirmation is required.</p>
              ) : null}
            </div>
          </div>
        </div>
        <div
          className={cn(
            "rounded-xl border bg-white p-3",
            signatureConsentMissing ? "border-destructive bg-destructive/5" : "border-border/60"
          )}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id="electronic-signature"
              checked={electronicSignatureConsent}
              onCheckedChange={(checked) => setElectronicSignatureConsent(Boolean(checked))}
            />
            <div className="space-y-1">
              <Label htmlFor="electronic-signature" className="cursor-pointer text-sm leading-6">
                <RequiredInlineText>
                  I agree that my electronic signature has the same effect as my handwritten signature.
                </RequiredInlineText>
              </Label>
              {signatureConsentMissing ? (
                <p className="text-xs font-medium text-destructive">This confirmation is required.</p>
              ) : null}
            </div>
          </div>
        </div>
        <div
          className={cn(
            "rounded-xl border bg-white p-3",
            authorityMissing ? "border-destructive bg-destructive/5" : "border-border/60"
          )}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id="authority-confirmed"
              checked={authorityConfirmed}
              onCheckedChange={(checked) => setAuthorityConfirmed(Boolean(checked))}
            />
            <div className="space-y-1">
              <Label htmlFor="authority-confirmed" className="cursor-pointer text-sm leading-6">
                <RequiredInlineText>
                  I confirm that I am the parent or legal guardian authorized to sign for the client named above.
                </RequiredInlineText>
              </Label>
              {authorityMissing ? (
                <p className="text-xs font-medium text-destructive">This confirmation is required.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Turnstile
        sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
        onVerify={(token) => setTurnstileToken(token)}
      />

      {submitSummaryMessage ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">There’s something to fix before submitting.</p>
              <p className="mt-1">{submitSummaryMessage}</p>
            </div>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || isPending}
        className={cn(
          "w-full transition-all duration-200",
          isValidatingSubmit && !isPending && "scale-[0.99] shadow-lg"
        )}
        style={{
          ...brandButtonStyles,
          borderColor: brandButtonStyles.backgroundColor,
        }}
      >
        {(isPending || isValidatingSubmit) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? "Submitting Agreement..." : isValidatingSubmit ? "Checking Form..." : "Submit Signed Agreement"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        When something is missing, the fields above will highlight in red.
      </p>
    </div>
  );
}

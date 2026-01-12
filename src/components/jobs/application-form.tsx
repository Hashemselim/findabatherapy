"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Loader2, ShieldCheck, Upload, FileText, X, CheckCircle } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitApplication } from "@/lib/actions/applications";
import {
  applicationFormSchema,
  type ApplicationFormData,
  type ApplicationFormInput,
  APPLICATION_SOURCES,
  ALLOWED_RESUME_EXTENSIONS,
  RESUME_MAX_SIZE,
  isValidResumeType,
  isValidResumeSize,
} from "@/lib/validations/jobs";

const APPLICANT_INFO_KEY = "findabajobs_applicant_info";

interface SavedApplicantInfo {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  linkedinUrl: string;
}

interface ApplicationFormProps {
  jobId: string;
  jobTitle: string;
  providerName: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  className?: string;
}

export function ApplicationForm({
  jobId,
  jobTitle,
  providerName,
  onSuccess,
  onError,
  onClose,
  className,
}: ApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ApplicationFormInput, unknown, ApplicationFormData>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      applicantName: "",
      applicantEmail: "",
      applicantPhone: "",
      coverLetter: "",
      linkedinUrl: "",
      source: "direct",
      website: "", // Honeypot
    },
  });

  const source = watch("source");

  // Load saved applicant info from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(APPLICANT_INFO_KEY);
      if (saved) {
        const info: SavedApplicantInfo = JSON.parse(saved);
        if (info.applicantName) setValue("applicantName", info.applicantName);
        if (info.applicantEmail) setValue("applicantEmail", info.applicantEmail);
        if (info.applicantPhone) setValue("applicantPhone", info.applicantPhone);
        if (info.linkedinUrl) setValue("linkedinUrl", info.linkedinUrl);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [setValue]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setResumeError(null);

    if (!file) {
      setResumeFile(null);
      return;
    }

    // Validate file type
    if (!isValidResumeType(file.type)) {
      setResumeError(
        `Invalid file type. Please upload a ${ALLOWED_RESUME_EXTENSIONS.join(", ")} file.`
      );
      setResumeFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Validate file size
    if (!isValidResumeSize(file.size)) {
      setResumeError(
        `File too large. Maximum size is ${RESUME_MAX_SIZE / (1024 * 1024)}MB.`
      );
      setResumeFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setResumeFile(file);
  }, []);

  const removeResume = useCallback(() => {
    setResumeFile(null);
    setResumeError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const onSubmit = async (data: ApplicationFormData) => {
    if (!turnstileToken) {
      const errorMsg = "Please complete the security verification";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Prepare resume file data if present
    let resumeData: {
      name: string;
      type: string;
      size: number;
      arrayBuffer: ArrayBuffer;
    } | undefined;

    if (resumeFile) {
      try {
        const arrayBuffer = await resumeFile.arrayBuffer();
        resumeData = {
          name: resumeFile.name,
          type: resumeFile.type,
          size: resumeFile.size,
          arrayBuffer,
        };
      } catch {
        setError("Failed to process resume file. Please try again.");
        setIsSubmitting(false);
        return;
      }
    }

    const result = await submitApplication(jobId, data, turnstileToken, resumeData);

    if (result.success) {
      // Save applicant info to localStorage for future prefill
      try {
        const info: SavedApplicantInfo = {
          applicantName: data.applicantName,
          applicantEmail: data.applicantEmail,
          applicantPhone: data.applicantPhone || "",
          linkedinUrl: data.linkedinUrl || "",
        };
        localStorage.setItem(APPLICANT_INFO_KEY, JSON.stringify(info));
      } catch {
        // Ignore localStorage errors
      }

      setIsSuccess(true);
      reset();
      setResumeFile(null);
      setTurnstileToken(null);
      onSuccess?.();
    } else {
      const errorMsg = result.error;
      setError(errorMsg);
      onError?.(errorMsg);
      // Reset Turnstile on error so user can try again
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }

    setIsSubmitting(false);
  };

  // Show success state
  if (isSuccess) {
    return (
      <div className={`rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center ${className}`}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-emerald-900">
          Application Submitted!
        </h3>
        <p className="mt-2 text-sm text-emerald-700">
          Your application for <span className="font-medium">{jobTitle}</span> at{" "}
          <span className="font-medium">{providerName}</span> has been submitted
          successfully. The employer will review your application and contact you
          if they&apos;re interested.
        </p>
{onClose && (
          <Button
            variant="outline"
            className="mt-6"
            onClick={onClose}
          >
            Done
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={className}>
      <div className="space-y-5">
        {/* Name and Email */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="applicantName" className="text-sm font-medium">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="applicantName"
              placeholder="Your full name"
              className="rounded-xl border-border/60 bg-muted/30 transition-all duration-300 focus:border-emerald-500 focus:bg-background focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] focus:ring-0"
              {...register("applicantName")}
              aria-invalid={!!errors.applicantName}
            />
            {errors.applicantName && (
              <p className="text-sm text-destructive">{errors.applicantName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="applicantEmail" className="text-sm font-medium">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="applicantEmail"
              type="email"
              placeholder="your@email.com"
              className="rounded-xl border-border/60 bg-muted/30 transition-all duration-300 focus:border-emerald-500 focus:bg-background focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] focus:ring-0"
              {...register("applicantEmail")}
              aria-invalid={!!errors.applicantEmail}
            />
            {errors.applicantEmail && (
              <p className="text-sm text-destructive">{errors.applicantEmail.message}</p>
            )}
          </div>
        </div>

        {/* Phone and LinkedIn */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="applicantPhone" className="text-sm font-medium">
              Phone <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="applicantPhone"
              type="tel"
              placeholder="(555) 123-4567"
              className="rounded-xl border-border/60 bg-muted/30 transition-all duration-300 focus:border-emerald-500 focus:bg-background focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] focus:ring-0"
              {...register("applicantPhone")}
              aria-invalid={!!errors.applicantPhone}
            />
            {errors.applicantPhone && (
              <p className="text-sm text-destructive">{errors.applicantPhone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedinUrl" className="text-sm font-medium">
              LinkedIn URL <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/yourprofile"
              className="rounded-xl border-border/60 bg-muted/30 transition-all duration-300 focus:border-emerald-500 focus:bg-background focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] focus:ring-0"
              {...register("linkedinUrl")}
              aria-invalid={!!errors.linkedinUrl}
            />
            {errors.linkedinUrl && (
              <p className="text-sm text-destructive">{errors.linkedinUrl.message}</p>
            )}
          </div>
        </div>

        {/* Resume Upload */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Resume <span className="text-muted-foreground">(PDF, DOC, DOCX - max 10MB)</span>
          </Label>
          {resumeFile ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {resumeFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(resumeFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={removeResume}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="relative cursor-pointer rounded-xl border-2 border-dashed border-border/60 bg-muted/20 p-6 text-center transition-all duration-300 hover:border-emerald-500/50 hover:bg-emerald-50/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-emerald-600">Click to upload</span> or
                drag and drop
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, DOC, DOCX up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
          )}
          {resumeError && (
            <p className="text-sm text-destructive">{resumeError}</p>
          )}
        </div>

        {/* Cover Letter */}
        <div className="space-y-2">
          <Label htmlFor="coverLetter" className="text-sm font-medium">
            Cover Letter <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="coverLetter"
            placeholder="Tell the employer why you're interested in this position and what makes you a great fit..."
            rows={5}
            className="rounded-xl border-border/60 bg-muted/30 transition-all duration-300 focus:border-emerald-500 focus:bg-background focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] focus:ring-0"
            {...register("coverLetter")}
            aria-invalid={!!errors.coverLetter}
          />
          {errors.coverLetter && (
            <p className="text-sm text-destructive">{errors.coverLetter.message}</p>
          )}
        </div>

        {/* How did you hear about us */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            How did you find this job?
          </Label>
          <Select
            value={source}
            onValueChange={(value) => setValue("source", value as ApplicationFormData["source"])}
          >
            <SelectTrigger className="rounded-xl border-border/60 bg-muted/30">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {APPLICATION_SOURCES.map((src) => (
                <SelectItem key={src.value} value={src.value}>
                  {src.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Honeypot field - hidden from users */}
        <input
          type="text"
          {...register("website")}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
          tabIndex={-1}
          autoComplete="off"
        />

        {/* Security Verification Section */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 transition-all duration-300 hover:border-border/80 hover:bg-muted/30">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span>Security verification</span>
          </div>
          <div className="flex justify-center overflow-hidden">
            <div className="scale-[0.85] sm:scale-100" style={{ transformOrigin: "center" }}>
              <Turnstile
                ref={turnstileRef}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={(token) => setTurnstileToken(token)}
                onError={() => {
                  setTurnstileToken(null);
                  const errorMsg = "Security verification failed. Please try again.";
                  setError(errorMsg);
                  onError?.(errorMsg);
                }}
                onExpire={() => {
                  setTurnstileToken(null);
                }}
                options={{
                  theme: "light",
                  size: "flexible",
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="group w-full rounded-full bg-emerald-600 text-white py-6 text-base font-medium transition-all duration-300 hover:-translate-y-[2px] hover:bg-emerald-700 hover:shadow-[0_4px_20px_rgba(16,185,129,0.35)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(16,185,129,0.2)] disabled:hover:translate-y-0 disabled:hover:shadow-none"
          disabled={isSubmitting || !turnstileToken}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              Submit Application
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By submitting this application, you agree to share your information with {providerName}.
        </p>
      </div>
    </form>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Loader2, CheckCircle, MessageSquare, ShieldCheck } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

const CONTACT_INFO_KEY = "findabatherapy_contact_info";

interface SavedContactInfo {
  familyName: string;
  familyEmail: string;
  familyPhone: string;
  childAge: string;
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { submitInquiry } from "@/lib/actions/inquiries";
import { contactFormSchema, type ContactFormData } from "@/lib/validations/contact";

interface ContactFormProps {
  listingId: string;
  providerName: string;
  locationId?: string;
}

export function ContactForm({ listingId, providerName, locationId }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      familyName: "",
      familyEmail: "",
      familyPhone: "",
      childAge: "",
      message: "",
      website: "", // Honeypot
    },
  });

  // Load saved contact info from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONTACT_INFO_KEY);
      if (saved) {
        const contactInfo: SavedContactInfo = JSON.parse(saved);
        if (contactInfo.familyName) setValue("familyName", contactInfo.familyName);
        if (contactInfo.familyEmail) setValue("familyEmail", contactInfo.familyEmail);
        if (contactInfo.familyPhone) setValue("familyPhone", contactInfo.familyPhone);
        if (contactInfo.childAge) setValue("childAge", contactInfo.childAge);
      }
    } catch {
      // Ignore localStorage errors (e.g., in incognito mode)
    }
  }, [setValue]);

  const onSubmit = async (data: ContactFormData) => {
    if (!turnstileToken) {
      setError("Please complete the security verification");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await submitInquiry(listingId, data, turnstileToken, locationId);

    if (result.success) {
      // Save contact info to localStorage for future prefill
      try {
        const contactInfo: SavedContactInfo = {
          familyName: data.familyName,
          familyEmail: data.familyEmail,
          familyPhone: data.familyPhone || "",
          childAge: data.childAge || "",
        };
        localStorage.setItem(CONTACT_INFO_KEY, JSON.stringify(contactInfo));
      } catch {
        // Ignore localStorage errors
      }

      setIsSuccess(true);
      reset();
      setTurnstileToken(null);
    } else {
      setError(result.error);
      // Reset Turnstile on error so user can try again
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }

    setIsSubmitting(false);
  };

  if (isSuccess) {
    return (
      <Card className="border border-border/80 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Message Sent Successfully!
          </h3>
          <p className="mt-2 max-w-sm text-muted-foreground">
            Thank you for your inquiry. {providerName} will review your message and respond within 1-2 business days.
          </p>
          <Button
            variant="outline"
            className="mt-6 rounded-full px-6 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:translate-y-0"
            onClick={() => setIsSuccess(false)}
          >
            Send Another Message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/80 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Contact {providerName}
        </CardTitle>
        <CardDescription>
          Send a message to learn more about their services. They typically respond within 1-2 business days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="familyName" className="text-sm font-medium">
                Your Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="familyName"
                placeholder="Full name"
                className="rounded-xl border-border/60 bg-muted/30 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus:border-[#5788FF] focus:bg-background focus:shadow-[0_0_0_3px_rgba(87,136,255,0.1)] focus:ring-0"
                {...register("familyName")}
                aria-invalid={!!errors.familyName}
              />
              {errors.familyName && (
                <p className="text-sm text-destructive">{errors.familyName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="familyEmail" className="text-sm font-medium">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="familyEmail"
                type="email"
                placeholder="your@email.com"
                className="rounded-xl border-border/60 bg-muted/30 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus:border-[#5788FF] focus:bg-background focus:shadow-[0_0_0_3px_rgba(87,136,255,0.1)] focus:ring-0"
                {...register("familyEmail")}
                aria-invalid={!!errors.familyEmail}
              />
              {errors.familyEmail && (
                <p className="text-sm text-destructive">{errors.familyEmail.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="familyPhone" className="text-sm font-medium">
                Phone <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="familyPhone"
                type="tel"
                placeholder="(555) 123-4567"
                className="rounded-xl border-border/60 bg-muted/30 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus:border-[#5788FF] focus:bg-background focus:shadow-[0_0_0_3px_rgba(87,136,255,0.1)] focus:ring-0"
                {...register("familyPhone")}
                aria-invalid={!!errors.familyPhone}
              />
              {errors.familyPhone && (
                <p className="text-sm text-destructive">{errors.familyPhone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="childAge" className="text-sm font-medium">
                Child&apos;s Age <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="childAge"
                placeholder="e.g., 5 years old"
                className="rounded-xl border-border/60 bg-muted/30 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus:border-[#5788FF] focus:bg-background focus:shadow-[0_0_0_3px_rgba(87,136,255,0.1)] focus:ring-0"
                {...register("childAge")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Tell them about your needs, questions, or situation..."
              rows={4}
              className="rounded-xl border-border/60 bg-muted/30 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus:border-[#5788FF] focus:bg-background focus:shadow-[0_0_0_3px_rgba(87,136,255,0.1)] focus:ring-0"
              {...register("message")}
              aria-invalid={!!errors.message}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
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
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-border/80 hover:bg-muted/30">
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
                    setError("Security verification failed. Please try again.");
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
            className="group w-full rounded-full py-6 text-base font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:shadow-[0_4px_20px_rgba(254,231,32,0.35)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(254,231,32,0.2)] disabled:hover:translate-y-0 disabled:hover:shadow-none"
            disabled={isSubmitting || !turnstileToken}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                Send Message
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By submitting this form, you agree to share your contact information with {providerName}.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { CheckCircle, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactFormFields } from "@/components/contact/contact-form-fields";

interface ContactFormProps {
  listingId: string;
  providerName: string;
  locationId?: string;
}

export function ContactForm({ listingId, providerName, locationId }: ContactFormProps) {
  const [isSuccess, setIsSuccess] = useState(false);

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
        <ContactFormFields
          listingId={listingId}
          providerName={providerName}
          locationId={locationId}
          source="listing_page"
          onSuccess={() => setIsSuccess(true)}
        />
      </CardContent>
    </Card>
  );
}

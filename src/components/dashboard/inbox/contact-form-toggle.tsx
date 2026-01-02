"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { updateContactFormEnabled } from "@/lib/actions/listings";

interface ContactFormToggleProps {
  contactFormEnabled: boolean;
}

export function ContactFormToggle({ contactFormEnabled }: ContactFormToggleProps) {
  const [isEnabled, setIsEnabled] = useState(contactFormEnabled);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
    startTransition(async () => {
      const result = await updateContactFormEnabled(checked);
      if (!result.success) {
        // Revert on error
        setIsEnabled(!checked);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        <Switch
          id="contact-form-toggle-compact"
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
      </div>
      <Label
        htmlFor="contact-form-toggle-compact"
        className="cursor-pointer text-sm font-medium text-muted-foreground"
      >
        {isEnabled ? "Contact form on" : "Contact form off"}
      </Label>
    </div>
  );
}

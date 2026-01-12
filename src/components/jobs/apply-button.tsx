"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ApplicationForm } from "./application-form";

interface ApplyButtonProps {
  jobId: string;
  jobTitle: string;
  providerName: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function ApplyButton({
  jobId,
  jobTitle,
  providerName,
  variant = "default",
  size = "default",
  className,
  style,
  children,
}: ApplyButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className} style={style}>
          {children || "Apply Now"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Apply for {jobTitle}</DialogTitle>
          <DialogDescription>
            Submit your application to {providerName}
          </DialogDescription>
        </DialogHeader>
        <ApplicationForm
          jobId={jobId}
          jobTitle={jobTitle}
          providerName={providerName}
          onSuccess={() => {
            // Keep dialog open to show success state
          }}
          onClose={() => setOpen(false)}
          className="mt-4"
        />
      </DialogContent>
    </Dialog>
  );
}

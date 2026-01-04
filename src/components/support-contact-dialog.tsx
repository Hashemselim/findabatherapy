"use client";

import { Check, Copy, Mail } from "lucide-react";
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

const SUPPORT_EMAIL = "Support@FindABATherapy.org";

export function SupportContactDialog({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleEmailClient = (client: "gmail" | "outlook" | "yahoo") => {
    const subject = encodeURIComponent("Enterprise Plan Inquiry");
    const body = encodeURIComponent("Hi,\n\nI have a question about the Enterprise plan.\n\n");

    const urls = {
      gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}&su=${subject}&body=${body}`,
      outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${SUPPORT_EMAIL}&subject=${subject}&body=${body}`,
      yahoo: `https://compose.mail.yahoo.com/?to=${SUPPORT_EMAIL}&subject=${subject}&body=${body}`,
    };

    window.open(urls[client], "_blank");
  };

  const copyEmail = async () => {
    await navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>
            Have questions about Enterprise pricing or features? We&apos;re here to help.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10">
              <Mail className="h-5 w-5 text-[#5788FF]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Email us at</p>
              <p className="truncate text-sm text-muted-foreground">{SUPPORT_EMAIL}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Open with your email provider</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleEmailClient("gmail")}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-white p-4 transition-all duration-200 active:scale-95 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-red-200 [@media(hover:hover)]:hover:shadow-[0_4px_12px_rgba(234,67,53,0.15)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 transition-transform duration-200 [@media(hover:hover)]:group-hover:scale-110">
                  <svg className="h-5 w-5 text-[#EA4335]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-muted-foreground [@media(hover:hover)]:group-hover:text-foreground">Gmail</span>
              </button>
              <button
                type="button"
                onClick={() => handleEmailClient("outlook")}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-white p-4 transition-all duration-200 active:scale-95 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-blue-200 [@media(hover:hover)]:hover:shadow-[0_4px_12px_rgba(0,120,212,0.15)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 transition-transform duration-200 [@media(hover:hover)]:group-hover:scale-110">
                  <svg className="h-5 w-5 text-[#0078D4]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.154-.352.23-.58.23h-8.547v-6.959l1.6 1.229c.1.086.215.129.346.129.14 0 .26-.05.363-.148l.796-.697a.478.478 0 0 0 .168-.377.478.478 0 0 0-.168-.377l-5.106-4.322a.478.478 0 0 0-.377-.148.478.478 0 0 0-.377.148L6.773 11.47a.478.478 0 0 0-.168.377c0 .148.056.274.168.377l.796.697a.478.478 0 0 0 .363.148.478.478 0 0 0 .346-.129l1.6-1.229v6.96H.818a.788.788 0 0 1-.58-.23A.788.788 0 0 1 0 17.865V7.387l9.818 7.628c.334.26.717.39 1.15.39.432 0 .815-.13 1.15-.39L24 7.387zM23.762 5.33a.764.764 0 0 1 .238.568v.126l-11.58 9.044a.478.478 0 0 1-.377.148.478.478 0 0 1-.377-.148L.42 5.83v-.126c0-.216.08-.407.238-.568A.788.788 0 0 1 1.238 5h21.524c.228 0 .422.077.58.23.158.154.238.346.238.568v.532z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-muted-foreground [@media(hover:hover)]:group-hover:text-foreground">Outlook</span>
              </button>
              <button
                type="button"
                onClick={() => handleEmailClient("yahoo")}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-white p-4 transition-all duration-200 active:scale-95 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-purple-200 [@media(hover:hover)]:hover:shadow-[0_4px_12px_rgba(111,45,168,0.15)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 transition-transform duration-200 [@media(hover:hover)]:group-hover:scale-110">
                  <svg className="h-5 w-5 text-[#6F2DA8]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.996 18.326l-.396.024V24l.396.025C17.064 23.49 20 20.121 20 16V8.5l-.396-.025C15.68 8.995 12.996 11.879 12.996 15.5v2.826zM11 24v-5.674l.396-.024c0-3.621-2.684-6.505-6.608-7.025L4.393 11.3V16c0 4.121 2.936 7.49 6.607 8z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-muted-foreground [@media(hover:hover)]:group-hover:text-foreground">Yahoo</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={copyEmail}
            className="w-full rounded-full"
          >
            {copied ? (
              <Check className="mr-2 h-4 w-4 text-green-500" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy Email Address"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

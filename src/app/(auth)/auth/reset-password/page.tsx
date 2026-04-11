"use client";

import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader className="space-y-4 text-center">
          <Badge className="mx-auto rounded-full border border-[#0866FF]/20 bg-[#0866FF]/8 px-4 py-1.5 text-sm font-semibold text-[#0866FF] shadow-xs">
            Account Recovery
          </Badge>
          <CardTitle className="text-3xl">Reset your password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Password recovery is handled in the Clerk sign-in flow.
            Continue below and use the forgot password option there.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full rounded-full" asChild>
            <Link href="/auth/sign-in">
              <KeyRound className="mr-2 h-4 w-4" />
              Go to sign in
            </Link>
          </Button>
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

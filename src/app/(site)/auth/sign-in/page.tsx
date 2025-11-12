import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Providers</p>
          <CardTitle className="text-3xl">Sign in to your dashboard</CardTitle>
          <p className="text-sm text-muted-foreground">
            Access your listing, leads, and billing. Don’t have an account?{" "}
            <Link href="/auth/sign-up" className="text-primary hover:underline">
              Sign up
            </Link>
            .
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Email" type="email" />
          <Input placeholder="Password" type="password" />
          <Button className="w-full rounded-full">Sign in</Button>
          <Button variant="outline" className="w-full rounded-full">
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

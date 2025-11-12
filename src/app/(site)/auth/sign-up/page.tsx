import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SignUpPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Providers</p>
          <CardTitle className="text-3xl">Create your agency account</CardTitle>
          <p className="text-sm text-muted-foreground">
            Already listed?{" "}
            <Link href="/auth/sign-in" className="text-primary hover:underline">
              Sign in
            </Link>
            .
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Agency name" />
          <Input placeholder="Work email" type="email" />
          <Input placeholder="Password" type="password" />
          <Button className="w-full rounded-full">Continue</Button>
          <Button variant="outline" className="w-full rounded-full">
            Sign up with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

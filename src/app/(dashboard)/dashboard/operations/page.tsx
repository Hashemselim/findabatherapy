import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OperationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Operations</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
          Internal workflows and shared tools for running your agency.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>Track client records and status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/clients" className="text-sm text-primary hover:underline">
              Open client management
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>Manage team tasks and follow-ups.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/tasks" className="text-sm text-primary hover:underline">
              Open task board
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branded Forms</CardTitle>
            <CardDescription>Share intake/contact forms with your branding.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/intake-pages/intake-form" className="text-sm text-primary hover:underline">
              Open forms
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
            <CardDescription>Publish client and employee resources.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/intake-pages/resources" className="text-sm text-primary hover:underline">
              Open resources
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

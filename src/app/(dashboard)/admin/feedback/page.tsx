import { Suspense } from "react";
import { MessageSquare, Mail } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedbackList } from "@/components/admin/feedback-list";
import { getFeedback } from "@/lib/actions/feedback";

function FeedbackSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full max-w-md" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function FeedbackContent() {
  const result = await getFeedback();

  if (!result.success || !result.data) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-foreground">Unable to load feedback</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            There was an error loading feedback. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <FeedbackList
      initialFeedback={result.data.feedback}
      initialUnreadCount={result.data.unreadCount}
    />
  );
}

export default function AdminFeedbackPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">User Feedback</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Review and respond to feedback from users and providers.
        </p>
      </div>

      <Suspense fallback={<FeedbackSkeleton />}>
        <FeedbackContent />
      </Suspense>
    </div>
  );
}

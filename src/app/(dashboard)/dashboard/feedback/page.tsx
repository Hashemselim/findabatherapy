import { Metadata } from "next";
import { redirect } from "next/navigation";

import { FeedbackForm } from "@/components/feedback/feedback-form";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Send Feedback | Dashboard | FindABATherapy",
  description: "Share your feedback, report issues, or request features to help us improve FindABATherapy.",
};

export default async function DashboardFeedbackPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Send Us Feedback
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your feedback helps us build a better platform. Let us know about bugs, feature requests, or share your thoughts.
        </p>
      </div>
      <FeedbackForm />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Loader2, CheckCircle, Star } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitFeedbackAuthenticated } from "@/lib/actions/feedback";
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from "@/lib/validations/feedback";
import { cn } from "@/lib/utils";

// Simplified schema for authenticated users
const authenticatedFeedbackSchema = z.object({
  category: z.enum(["feature_request", "bug_report", "general_feedback", "question", "compliment"]),
  rating: z.number().min(1).max(5).optional(),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must be less than 5000 characters"),
});

type AuthenticatedFeedbackData = z.infer<typeof authenticatedFeedbackSchema>;

interface FeedbackFormProps {
  defaultCategory?: FeedbackCategory;
}

export function FeedbackForm({ defaultCategory = "general_feedback" }: FeedbackFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AuthenticatedFeedbackData>({
    resolver: zodResolver(authenticatedFeedbackSchema),
    defaultValues: {
      category: defaultCategory,
      rating: undefined,
      message: "",
    },
  });

  const category = watch("category");

  const onSubmit = async (data: AuthenticatedFeedbackData) => {
    setIsSubmitting(true);
    setError(null);

    const result = await submitFeedbackAuthenticated(
      {
        category: data.category,
        rating: selectedRating ?? undefined,
        message: data.message,
      },
      typeof window !== "undefined" ? window.location.href : undefined
    );

    if (result.success) {
      setIsSuccess(true);
      reset();
      setSelectedRating(null);
    } else {
      setError(result.error);
    }

    setIsSubmitting(false);
  };

  if (isSuccess) {
    return (
      <Card className="border border-border/80">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Thank You for Your Feedback!
          </h3>
          <p className="mt-2 max-w-sm text-muted-foreground">
            We appreciate you taking the time to help us improve. We&apos;ll review your submission and may reach out if we need more information.
          </p>
          <Button
            variant="outline"
            className="mt-6 rounded-full px-6"
            onClick={() => setIsSuccess(false)}
          >
            Submit More Feedback
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/80">
      <CardHeader>
        <CardTitle>Send Us Feedback</CardTitle>
        <CardDescription>
          We value your input! Let us know about bugs, feature requests, or just share your thoughts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Feedback Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={category}
              onValueChange={(value) => setValue("category", value as FeedbackCategory)}
            >
              <SelectTrigger className="rounded-xl border-border/60 bg-muted/30 transition-colors focus:border-primary focus:bg-background">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FEEDBACK_CATEGORIES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Star Rating */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              How would you rate your experience? <span className="text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setSelectedRating(rating)}
                  onMouseEnter={() => setHoveredRating(rating)}
                  onMouseLeave={() => setHoveredRating(null)}
                  className="rounded-lg p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      (hoveredRating !== null ? rating <= hoveredRating : rating <= (selectedRating || 0))
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/40"
                    )}
                  />
                </button>
              ))}
              {selectedRating && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {selectedRating === 1 && "Poor"}
                  {selectedRating === 2 && "Fair"}
                  {selectedRating === 3 && "Good"}
                  {selectedRating === 4 && "Very Good"}
                  {selectedRating === 5 && "Excellent"}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Your Feedback <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder={
                category === "bug_report"
                  ? "Please describe the issue in detail. What were you trying to do? What happened instead? Any error messages?"
                  : category === "feature_request"
                  ? "Describe the feature you'd like to see. How would it help you?"
                  : "Share your thoughts, suggestions, or experiences..."
              }
              rows={6}
              className="rounded-xl border-border/60 bg-muted/30 transition-colors focus:border-primary focus:bg-background"
              {...register("message")}
              aria-invalid={!!errors.message}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full rounded-full py-6 text-base font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Feedback
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

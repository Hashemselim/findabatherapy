import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface GoogleReviewDisplay {
  id: string;
  authorName: string;
  authorPhotoUrl: string | null;
  rating: number;
  text: string | null;
  relativeTimeDescription: string | null;
}

interface GoogleReviewsGalleryProps {
  reviews: GoogleReviewDisplay[];
  googleMapsUrl?: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

export function GoogleReviewsGallery({ reviews, googleMapsUrl }: GoogleReviewsGalleryProps) {
  if (reviews.length === 0) {
    return null;
  }

  return (
    <Card className="border border-border/80 transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </div>
          Google Reviews
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-4 ${reviews.length === 1 ? "" : reviews.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2"}`}>
          {reviews.map((review) => (
            <div
              key={review.id}
              className="group rounded-xl border border-border/60 bg-muted/20 p-4 transition-all duration-300 ease-premium hover:border-amber-200 hover:bg-amber-50/30 hover:shadow-[0_4px_20px_rgba(251,191,36,0.1)]"
            >
              <div className="space-y-3">
                {/* Header with name and rating */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
                    {review.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{review.authorName}</p>
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} />
                      {review.relativeTimeDescription && (
                        <span className="text-xs text-muted-foreground">· {review.relativeTimeDescription}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Review text */}
                {review.text && (
                  <p className="text-sm leading-relaxed text-muted-foreground line-clamp-4">
                    &ldquo;{review.text}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Link to Google Maps for more reviews */}
        {googleMapsUrl && (
          <div className="mt-4 text-center">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>See all reviews on Google</span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

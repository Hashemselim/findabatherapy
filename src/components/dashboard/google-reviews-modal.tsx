"use client";

import { useState, useEffect, useTransition } from "react";
import { Star, Loader2, RefreshCw, Check, MessageSquareQuote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchGoogleReviews,
  getGoogleReviews,
  updateSelectedReviews,
  toggleShowGoogleReviews,
  type GoogleReview,
} from "@/lib/actions/google-business";

interface GoogleReviewsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  locationName: string;
  showGoogleReviews: boolean;
  onSuccess: () => void;
}

export function GoogleReviewsModal({
  open,
  onOpenChange,
  locationId,
  locationName,
  showGoogleReviews: initialShowReviews,
  onSuccess,
}: GoogleReviewsModalProps) {
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showReviews, setShowReviews] = useState(initialShowReviews);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, startFetching] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load existing reviews when modal opens
  useEffect(() => {
    if (open) {
      loadReviews();
    }
  }, [open, locationId]);

  // Track changes
  useEffect(() => {
    const currentSelected = new Set(reviews.filter((r) => r.isSelected).map((r) => r.id));
    const hasSelectionChanges =
      selectedIds.size !== currentSelected.size ||
      [...selectedIds].some((id) => !currentSelected.has(id));
    const hasToggleChanges = showReviews !== initialShowReviews;
    setHasChanges(hasSelectionChanges || hasToggleChanges);
  }, [selectedIds, showReviews, reviews, initialShowReviews]);

  const loadReviews = async () => {
    setIsLoading(true);
    setError(null);
    const result = await getGoogleReviews(locationId);
    if (result.success && result.data) {
      setReviews(result.data.reviews);
      setSelectedIds(new Set(result.data.reviews.filter((r) => r.isSelected).map((r) => r.id)));
    } else if (!result.success) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  const handleFetchReviews = () => {
    startFetching(async () => {
      setError(null);
      const result = await fetchGoogleReviews(locationId);
      if (result.success && result.data) {
        setReviews(result.data.reviews);
        setSelectedIds(new Set(result.data.reviews.filter((r) => r.isSelected).map((r) => r.id)));
      } else if (!result.success) {
        setError(result.error);
      }
    });
  };

  const handleToggleReview = (reviewId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        if (next.size >= 4) {
          setError("Maximum of 4 reviews can be selected");
          setTimeout(() => setError(null), 3000);
          return prev;
        }
        next.add(reviewId);
      }
      return next;
    });
  };

  const handleSave = () => {
    startSaving(async () => {
      setError(null);

      // Update selected reviews
      const selectResult = await updateSelectedReviews(locationId, [...selectedIds]);
      if (!selectResult.success) {
        setError(selectResult.error);
        return;
      }

      // Update show reviews toggle
      const toggleResult = await toggleShowGoogleReviews(locationId, showReviews);
      if (!toggleResult.success) {
        setError(toggleResult.error);
        return;
      }

      onSuccess();
      onOpenChange(false);
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${
              i < rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareQuote className="h-5 w-5 text-amber-500" />
            Manage Google Reviews
          </DialogTitle>
          <DialogDescription>
            Choose which Google reviews to display on your {locationName} listing. You can select up
            to 4 reviews.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Show Reviews Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-4">
            <div>
              <Label htmlFor="show-reviews" className="cursor-pointer font-medium">
                Display Google Reviews
              </Label>
              <p className="text-xs text-muted-foreground">
                Show selected reviews on your provider detail page
              </p>
            </div>
            <Switch
              id="show-reviews"
              checked={showReviews}
              onCheckedChange={setShowReviews}
              disabled={isSaving}
            />
          </div>

          {/* Fetch/Refresh Reviews Button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {reviews.length > 0
                ? `${reviews.length} reviews available (${selectedIds.size}/4 selected)`
                : "No reviews loaded"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchReviews}
              disabled={isFetching || isSaving}
            >
              {isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {reviews.length > 0 ? "Refresh" : "Fetch Reviews"}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Reviews List */}
          {!isLoading && reviews.length > 0 && (
            <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  onClick={() => handleToggleReview(review.id)}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    selectedIds.has(review.id)
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(review.id)}
                      onCheckedChange={() => handleToggleReview(review.id)}
                      disabled={isSaving}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{review.authorName}</p>
                        {renderStars(review.rating)}
                      </div>
                      {review.relativeTimeDescription && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {review.relativeTimeDescription}
                        </p>
                      )}
                      {review.text && (
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                          {review.text}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Reviews Message */}
          {!isLoading && reviews.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
              <MessageSquareQuote className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No reviews loaded yet. Click &quot;Fetch Reviews&quot; to load reviews from Google.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Note: Google provides up to 5 of your most relevant reviews.
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

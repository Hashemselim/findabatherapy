"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, Clock, ExternalLink, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getRemovalRequests,
  approveRemovalRequest,
  denyRemovalRequest,
  type RemovalRequestWithDetails,
} from "@/lib/actions/admin";

type StatusFilter = "all" | "pending" | "approved" | "denied";

export default function RemovalRequestsPage() {
  const [requests, setRequests] = useState<RemovalRequestWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{
    type: "approve" | "deny";
    request: RemovalRequestWithDetails;
  } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  async function loadRequests() {
    setIsLoading(true);
    const result = await getRemovalRequests({
      status: statusFilter === "all" ? undefined : statusFilter,
    });

    if (result.success && result.data) {
      setRequests(result.data.requests);
      setTotal(result.data.total);
    }
    setIsLoading(false);
  }

  function handleAction(type: "approve" | "deny", request: RemovalRequestWithDetails) {
    setActionModal({ type, request });
    setAdminNotes("");
  }

  function handleSubmitAction() {
    if (!actionModal) return;

    startTransition(async () => {
      const action = actionModal.type === "approve" ? approveRemovalRequest : denyRemovalRequest;
      const result = await action(actionModal.request.id, adminNotes || undefined);

      if (result.success) {
        setActionModal(null);
        loadRequests();
      } else {
        alert(result.error);
      }
    });
  }

  const statusColors: Record<string, string> = {
    pending: "border-amber-300 bg-amber-50 text-amber-700",
    approved: "border-green-300 bg-green-50 text-green-700",
    denied: "border-red-300 bg-red-50 text-red-700",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    approved: <CheckCircle className="h-3 w-3" />,
    denied: <XCircle className="h-3 w-3" />,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Removal Requests</h1>
        <p className="text-muted-foreground">
          Review and process listing removal requests from providers
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "pending", "approved", "denied"] as StatusFilter[]).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No removal requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{total} request(s) found</p>

          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      Request to Remove: {request.googlePlacesListing.name}
                      <Badge className={statusColors[request.status]}>
                        {statusIcons[request.status]}
                        <span className="ml-1">{request.status}</span>
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {request.googlePlacesListing.city}, {request.googlePlacesListing.state}
                    </CardDescription>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Submitted</p>
                    <p className="font-medium">{new Date(request.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Requester info */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Requester</h4>
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <p className="font-medium">{request.profile.agencyName}</p>
                      <p className="text-muted-foreground">{request.profile.contactEmail}</p>
                      <Link
                        href={`/provider/${request.listing.slug}`}
                        className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
                        target="_blank"
                      >
                        View their listing
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Directory listing info */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Directory Listing to Remove</h4>
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <p className="font-medium">{request.googlePlacesListing.name}</p>
                      <p className="text-muted-foreground">
                        {request.googlePlacesListing.city}, {request.googlePlacesListing.state}
                      </p>
                      <Link
                        href={`/provider/p/${request.googlePlacesListing.slug}`}
                        className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
                        target="_blank"
                      >
                        View directory listing
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                {request.reason && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Reason Provided</h4>
                    <p className="rounded-lg border bg-muted/30 p-3 text-sm">
                      {request.reason}
                    </p>
                  </div>
                )}

                {/* Admin notes (if reviewed) */}
                {request.adminNotes && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Admin Notes</h4>
                    <p className="rounded-lg border bg-muted/30 p-3 text-sm">
                      {request.adminNotes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {request.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleAction("approve", request)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleAction("deny", request)}
                      variant="destructive"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Deny
                    </Button>
                  </div>
                )}

                {/* Reviewed info */}
                {request.reviewedAt && (
                  <p className="text-xs text-muted-foreground">
                    Reviewed on {new Date(request.reviewedAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Modal */}
      <Dialog open={!!actionModal} onOpenChange={(open) => !open && setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal?.type === "approve" ? "Approve" : "Deny"} Removal Request
            </DialogTitle>
            <DialogDescription>
              {actionModal?.type === "approve"
                ? "This will hide the directory listing from search results."
                : "The directory listing will remain visible."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Notes (optional)</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this decision..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAction}
              disabled={isPending}
              className={actionModal?.type === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={actionModal?.type === "deny" ? "destructive" : "default"}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : actionModal?.type === "approve" ? (
                "Approve & Remove Listing"
              ) : (
                "Deny Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

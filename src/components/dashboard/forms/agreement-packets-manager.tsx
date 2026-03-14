"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  ArrowDown,
  ArrowUp,
  ClipboardCheck,
  FileText,
  Link2,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import type {
  AgreementPacketListItem,
  AgreementSubmissionListItem,
} from "@/lib/actions/agreements";
import {
  createAgreementPacket,
  deleteAgreementPacketDocument,
  getAgreementSubmissionSignedUrl,
  linkAgreementSubmissionToClient,
  moveAgreementPacketDocument,
  updateAgreementPacket,
  updateAgreementPacketDocument,
  uploadAgreementPacketDocument,
} from "@/lib/actions/agreements";
import { formatFileSize } from "@/lib/storage/config";
import { RelativeTime } from "@/components/ui/relative-time";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DashboardStatusBadge,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCard,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeader,
  DashboardTableRow,
} from "@/components/dashboard/ui";

import { AgreementLinkDialog } from "./agreement-link-dialog";

interface AgreementPacketsManagerProps {
  packets: AgreementPacketListItem[];
  submissions: AgreementSubmissionListItem[];
  clients: { id: string; name: string }[];
}

interface AgreementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packet?: AgreementPacketListItem | null;
}

function AgreementFormDialog({ open, onOpenChange, packet }: AgreementFormDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState(packet?.title || "");
  const [description, setDescription] = useState(packet?.description || "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setTitle(packet?.title || "");
      setDescription(packet?.description || "");
    }
  }, [open, packet]);

  const handleSave = () => {
    startTransition(async () => {
      const result = packet
        ? await updateAgreementPacket(packet.id, { title, description })
        : await createAgreementPacket({ title, description });

      if (!result.success) {
        toast.error(result.error || "Failed to save agreement form.");
        return;
      }

      toast.success(packet ? "Agreement form updated." : "Agreement form created.");
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{packet ? "Edit Agreement Form" : "Set Up Agreement Form"}</DialogTitle>
          <DialogDescription>
            This title and description appear at the top of the page families sign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agreement-title">Form title</Label>
            <Input
              id="agreement-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Parent agreements and policies"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agreement-description">Form description</Label>
            <Textarea
              id="agreement-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Explain what families are reviewing and signing."
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending || !title.trim()}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AgreementDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packet: AgreementPacketListItem | null;
  document?: AgreementPacketListItem["documents"][number] | null;
}

function AgreementDocumentDialog({
  open,
  onOpenChange,
  packet,
  document,
}: AgreementDocumentDialogProps) {
  const router = useRouter();
  const browseButtonRef = useRef<HTMLButtonElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState(document?.label || "");
  const [description, setDescription] = useState(document?.description || "");
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(document?.id);

  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setTitle(document?.label || "");
      setDescription(document?.description || "");
    }
  }, [open, document]);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setSelectedFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.pdf$/i, ""));
    }
  };

  const { getRootProps, getInputProps, isDragActive, open: openFileBrowser } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
    disabled: isPending || isEditing,
    noClick: true,
  });

  const handleSave = () => {
    if (!packet) return;

    startTransition(async () => {
      if (document?.id) {
        const result = await updateAgreementPacketDocument(document.id, {
          label: title,
          description,
        });

        if (!result.success) {
          toast.error(result.error || "Failed to update document.");
          return;
        }
        toast.success("Document updated.");
        onOpenChange(false);
        router.refresh();
        return;
      }

      if (!selectedFile) {
        toast.error("Choose a PDF first.");
        return;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("label", title.trim());
      formData.append("description", description.trim());

      const result = await uploadAgreementPacketDocument(packet.id, formData);
      if (!result.success) {
        toast.error(result.error || "Failed to upload document.");
        return;
      }

      toast.success("Document added.");
      onOpenChange(false);
      router.refresh();
    });
  };

  const isSaveDisabled = isPending || !title.trim() || (!isEditing && !selectedFile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Document" : "Add Document"}</DialogTitle>
          <DialogDescription>
            Upload one PDF, give it a clear title, and add a short description families will see before signing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEditing && (
            <div className="space-y-3">
              <div
                {...getRootProps()}
                className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 bg-muted/10"
                } ${isPending ? "pointer-events-none opacity-50" : ""}`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {isDragActive ? "Drop the PDF here" : "Drag and drop a PDF here"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PDF only, up to 10MB</p>
                <Button
                  ref={browseButtonRef}
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={openFileBrowser}
                  disabled={isPending}
                >
                  Browse Files
                </Button>
              </div>

              {selectedFile && (
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="document-title">Document title</Label>
            <Input
              id="document-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Safety policy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-description">Document description</Label>
            <Textarea
              id="document-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="One or two sentences telling parents what this document covers."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaveDisabled}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Add Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AgreementPacketsManager({
  packets,
  submissions,
  clients,
}: AgreementPacketsManagerProps) {
  const router = useRouter();
  const activePacket = useMemo(() => packets[0] || null, [packets]);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<AgreementPacketListItem["documents"][number] | null>(null);
  const [linkingSubmission, setLinkingSubmission] = useState<AgreementSubmissionListItem | null>(null);
  const [clientToLink, setClientToLink] = useState("");
  const [isPending, startTransition] = useTransition();

  const shareablePackets = activePacket
    ? [
        {
          id: activePacket.id,
          title: activePacket.title,
          slug: activePacket.slug,
          latestVersionId: activePacket.latest_version_id || "",
          latestVersionNumber: activePacket.latest_version_number || 1,
        },
      ]
    : [];

  const handleMoveDocument = (documentId: string, direction: "up" | "down") => {
    startTransition(async () => {
      const result = await moveAgreementPacketDocument(documentId, direction);
      if (!result.success) {
        toast.error(result.error || "Failed to reorder document.");
        return;
      }
      router.refresh();
    });
  };

  const handleDeleteDocument = (documentId: string) => {
    startTransition(async () => {
      const result = await deleteAgreementPacketDocument(documentId);
      if (!result.success) {
        toast.error(result.error || "Failed to delete document.");
        return;
      }
      toast.success("Document deleted.");
      router.refresh();
    });
  };

  const handleViewSubmission = (submissionId: string) => {
    startTransition(async () => {
      const result = await getAgreementSubmissionSignedUrl(submissionId);
      if (!result.success || !result.data) {
        toast.error(result.success ? "Failed to open signed agreement." : result.error);
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  };

  const handleLinkSubmission = () => {
    if (!linkingSubmission || !clientToLink) return;

    startTransition(async () => {
      const result = await linkAgreementSubmissionToClient({
        submission_id: linkingSubmission.id,
        client_id: clientToLink,
      });
      if (!result.success) {
        toast.error(result.error || "Failed to link signed agreement.");
        return;
      }

      toast.success("Signed agreement linked to client.");
      setLinkingSubmission(null);
      setClientToLink("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-white">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Agreement Form</CardTitle>
            <CardDescription>
              Upload the documents families must review and sign on your branded agreement page.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setFormDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              {activePacket ? "Edit Form Details" : "Set Up Form"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingDocument(null);
                setDocumentDialogOpen(true);
              }}
              disabled={!activePacket}
            >
              <Upload className="mr-2 h-4 w-4" />
              Add Document
            </Button>
            <Button
              type="button"
              onClick={() => setLinkDialogOpen(true)}
              disabled={!activePacket || activePacket.documents.length === 0}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Share Link
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activePacket ? (
            <>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                <p className="text-sm font-semibold text-foreground">{activePacket.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activePacket.description || "No description added yet."}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold">Documents</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Each document appears on the agreement page with its own title, description, checkbox, and PDF preview.
                  </p>
                </div>

                {activePacket.documents.length > 0 ? (
                  activePacket.documents.map((document, index) => (
                    <div
                      key={document.id}
                      className="flex flex-col gap-4 rounded-lg border border-border/60 bg-white p-4"
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 h-5 w-5 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {document.label || document.file_name}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {document.description || "No description added."}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {document.file_name} • {formatFileSize(document.file_size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingDocument(document);
                            setDocumentDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={index === 0 || isPending}
                          onClick={() => handleMoveDocument(document.id, "up")}
                        >
                          <ArrowUp className="mr-2 h-4 w-4" />
                          Move Up
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={index === activePacket.documents.length - 1 || isPending}
                          onClick={() => handleMoveDocument(document.id, "down")}
                        >
                          <ArrowDown className="mr-2 h-4 w-4" />
                          Move Down
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleDeleteDocument(document.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 px-4 py-10 text-center">
                    <p className="text-sm font-medium">No documents yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add your first PDF to start building the agreement page.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-12 text-center">
              <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Set up your agreement form</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a form title, then upload the documents parents need to read and sign.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-white">
        <CardHeader>
          <CardTitle>Signed Agreements</CardTitle>
          <CardDescription>
            Completed signatures are stored here. If a link was shared without a client attached, you can match it later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length > 0 ? (
            <DashboardTableCard>
              <DashboardTable>
                <DashboardTableHeader>
                  <DashboardTableRow>
                    <DashboardTableHead className="px-4">Agreement</DashboardTableHead>
                    <DashboardTableHead className="px-4">Signer</DashboardTableHead>
                    <DashboardTableHead className="px-4">Client</DashboardTableHead>
                    <DashboardTableHead className="px-4">Submitted</DashboardTableHead>
                    <DashboardTableHead className="px-4 text-right">Actions</DashboardTableHead>
                  </DashboardTableRow>
                </DashboardTableHeader>
                <DashboardTableBody>
                  {submissions.map((submission) => (
                    <DashboardTableRow key={submission.id}>
                      <DashboardTableCell className="px-4 py-3">
                        <div>
                          <p className="font-medium">{submission.packet_title}</p>
                          <p className="text-xs text-muted-foreground">
                            {submission.link_type === "assigned" ? "Shared with client" : "Generic link"}
                          </p>
                        </div>
                      </DashboardTableCell>
                      <DashboardTableCell className="px-4 py-3">
                        <div>
                          <p className="font-medium">{submission.signer_name}</p>
                          <p className="text-xs text-muted-foreground">{submission.client_name}</p>
                        </div>
                      </DashboardTableCell>
                      <DashboardTableCell className="px-4 py-3">
                        {submission.linked_client_label ? (
                          <div>
                            <p className="font-medium">{submission.linked_client_label}</p>
                            <DashboardStatusBadge tone="success">Linked</DashboardStatusBadge>
                          </div>
                        ) : (
                          <DashboardStatusBadge tone="warning">Needs client</DashboardStatusBadge>
                        )}
                      </DashboardTableCell>
                      <DashboardTableCell className="px-4 py-3">
                        <RelativeTime date={submission.submitted_at} />
                      </DashboardTableCell>
                      <DashboardTableCell className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSubmission(submission.id)}
                          >
                            View PDF
                          </Button>
                          {!submission.client_id && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setClientToLink("");
                                setLinkingSubmission(submission);
                              }}
                            >
                              Link to Client
                            </Button>
                          )}
                        </div>
                      </DashboardTableCell>
                    </DashboardTableRow>
                  ))}
                </DashboardTableBody>
              </DashboardTable>
            </DashboardTableCard>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-10 text-center">
              <p className="text-sm font-medium">No signed agreements yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Completed agreements will appear here after a parent signs.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AgreementFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        packet={activePacket}
      />

      <AgreementDocumentDialog
        open={documentDialogOpen}
        onOpenChange={(open) => {
          setDocumentDialogOpen(open);
          if (!open) setEditingDocument(null);
        }}
        packet={activePacket}
        document={editingDocument}
      />

      <AgreementLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        packets={shareablePackets}
        clients={clients}
        initialPacketId={activePacket?.id || null}
      />

      <Dialog
        open={Boolean(linkingSubmission)}
        onOpenChange={(open) => {
          if (!open) {
            setLinkingSubmission(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Signed Agreement</DialogTitle>
            <DialogDescription>
              Choose the client who should receive this signed agreement on their profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Select client</Label>
            <Select value={clientToLink} onValueChange={setClientToLink}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkingSubmission(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={!clientToLink || isPending} onClick={handleLinkSubmission}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Link Agreement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

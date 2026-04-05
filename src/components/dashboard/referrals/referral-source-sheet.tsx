"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Globe,
  Loader2,
  Mail,

  Phone,
  Plus,
  Sparkles,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  addReferralNote,
  enrichReferralSource,
  getReferralSourceDetail,
  logReferralTouchpoint,
  saveReferralContact,
  saveReferralTask,
  updateReferralSourceStage,
  type ReferralSourceDetail,
  type ReferralTemplate,
} from "@/lib/actions/referrals";
import {
  REFERRAL_SOURCE_STAGE_OPTIONS,
  REFERRAL_CONTACT_ROLE_OPTIONS,
  REFERRAL_TOUCHPOINT_TYPE_OPTIONS,
  REFERRAL_TOUCHPOINT_OUTCOME_OPTIONS,
  type ReferralSourceStage,
} from "@/lib/validations/referrals";
import { formatDistance } from "@/lib/geo/distance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";

import { Textarea } from "@/components/ui/textarea";
import { DashboardTabsList, DashboardTabsTrigger } from "@/components/dashboard/ui";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ReferralContactChannelIcons } from "./referral-contact-channel-icons";

/* ─────────────────────────── props ─────────────────────────── */

interface ReferralSourceSheetProps {
  sourceId: string | null;
  onClose: () => void;
  templates: ReferralTemplate[];
  onSendEmail: (sourceId: string, sourceName: string) => void;
}

/* ─────────────────────────── component ─────────────────────── */

export function ReferralSourceSheet({
  sourceId,
  onClose,
  onSendEmail,
}: ReferralSourceSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [source, setSource] = useState<ReferralSourceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick-add form state
  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRole, setContactRole] = useState("other");
  const [touchpointType, setTouchpointType] = useState("call");
  const [touchpointOutcome, setTouchpointOutcome] = useState("connected");
  const [touchpointNote, setTouchpointNote] = useState("");

  const loadSource = useCallback(async (id: string) => {
    setLoading(true);
    const result = await getReferralSourceDetail(id);
    if (result.success && result.data) {
      setSource(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (sourceId) {
      loadSource(sourceId);
    } else {
      setSource(null);
    }
  }, [sourceId, loadSource]);

  function refresh() {
    if (sourceId) loadSource(sourceId);
    router.refresh();
  }

  /* ── actions ── */

  function handleStageChange(stage: string) {
    if (!sourceId) return;
    startTransition(async () => {
      const result = await updateReferralSourceStage(sourceId, stage as ReferralSourceStage);
      if (!result.success) {
        toast.error(result.error || "Failed to update stage");
        return;
      }
      toast.success("Stage updated");
      refresh();
    });
  }

  function handleEnrich() {
    if (!sourceId || !source) return;
    const toastId = toast.loading(`Enriching ${source.name}...`, { description: "Crawling website for contact info" });
    startTransition(async () => {
      const result = await enrichReferralSource(sourceId);
      if (!result.success) {
        toast.error(result.error || "Failed to enrich", { id: toastId });
        return;
      }
      const { found, stageChanged, newStage } = result.data!;
      if (found.length === 0 && !stageChanged) {
        toast.info("No new info found", { id: toastId, description: "Try again later or add contact info manually" });
      } else {
        const parts: string[] = [];
        if (found.length > 0) parts.push(`Found: ${found.join(", ")}`);
        if (stageChanged && newStage) parts.push(`Stage → ${newStage.replace(/_/g, " ")}`);
        toast.success("Enrichment complete", { id: toastId, description: parts.join(" · ") });
      }
      refresh();
    });
  }

  function handleAddNote() {
    if (!sourceId || !noteText.trim()) return;
    startTransition(async () => {
      const result = await addReferralNote({ sourceId, note: noteText });
      if (!result.success) {
        toast.error(result.error || "Failed to save note");
        return;
      }
      toast.success("Note saved");
      setNoteText("");
      refresh();
    });
  }

  function handleAddTask() {
    if (!sourceId || !taskTitle.trim()) return;
    startTransition(async () => {
      const result = await saveReferralTask({
        sourceId,
        title: taskTitle,
        dueDate: taskDueDate || null,
        status: "pending",
      });
      if (!result.success) {
        toast.error(result.error || "Failed to save task");
        return;
      }
      toast.success("Task added");
      setTaskTitle("");
      setTaskDueDate("");
      refresh();
    });
  }

  function handleAddContact() {
    if (!sourceId || !contactName.trim()) return;
    startTransition(async () => {
      const result = await saveReferralContact({
        sourceId,
        name: contactName,
        email: contactEmail || null,
        role: contactRole as never,
        isPrimary: source?.contacts.length === 0,
      });
      if (!result.success) {
        toast.error(result.error || "Failed to save contact");
        return;
      }
      toast.success("Contact added");
      setContactName("");
      setContactEmail("");
      setContactRole("other");
      refresh();
    });
  }

  function handleLogTouchpoint() {
    if (!sourceId) return;
    startTransition(async () => {
      const result = await logReferralTouchpoint({
        sourceId,
        touchpointType: touchpointType as never,
        outcome: touchpointOutcome as never,
        body: touchpointNote || null,
      });
      if (!result.success) {
        toast.error(result.error || "Failed to log touchpoint");
        return;
      }
      toast.success("Touchpoint logged");
      setTouchpointNote("");
      refresh();
    });
  }

  const openTaskCount = source?.tasks.filter((t) => t.status !== "completed").length ?? 0;

  /* ── render ── */
  return (
    <Sheet open={!!sourceId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        {loading || !source ? (
          <div className="flex flex-1 items-center justify-center">
            <SheetTitle className="sr-only">Loading source details</SheetTitle>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ───── Header ───── */}
            <SheetHeader className="shrink-0 border-b px-6 py-5">
              <div className="min-w-0">
                <SheetTitle className="truncate text-lg leading-tight">
                  {source.name}
                </SheetTitle>
                <SheetDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="capitalize">{source.category.replace(/_/g, " ")}</span>
                  {source.city && (
                    <>
                      <span className="text-border">·</span>
                      <span>{source.city}, {source.state}</span>
                    </>
                  )}
                  {source.distance_miles != null && (
                    <>
                      <span className="text-border">·</span>
                      <span>{formatDistance(source.distance_miles)}</span>
                    </>
                  )}
                  {source.google_rating != null && (
                    <>
                      <span className="text-border">·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {source.google_rating}
                        <span className="text-muted-foreground/60">({source.google_rating_count ?? 0})</span>
                      </span>
                    </>
                  )}
                </SheetDescription>
              </div>

              {/* Stage + enrich row */}
              <div className="mt-3 flex items-center gap-2">
                <Select value={source.stage} onValueChange={handleStageChange}>
                  <SelectTrigger className="h-8 w-auto gap-1.5 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERRAL_SOURCE_STAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEnrich}
                  disabled={isPending}
                  className="h-8 text-xs"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Enrich
                </Button>
                <ReferralContactChannelIcons
                  contactability={source.contactability}
                  email={source.public_email}
                  phone={source.phone}
                  website={source.website}
                  contactFormUrl={source.contact_form_url}
                />
              </div>
            </SheetHeader>

            {/* ───── Scrollable body ───── */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-6">
                {/* Contact info card */}
                <section className="grid gap-3">
                  <SectionHeading>Contact Info</SectionHeading>
                  <div className="grid gap-2 rounded-lg border bg-muted/20 p-4">
                    {source.public_email && (
                      <InfoRow
                        icon={<Mail className="h-3.5 w-3.5" />}
                        label={source.public_email}
                        href={`mailto:${source.public_email}`}
                      />
                    )}
                    {source.phone && (
                      <InfoRow
                        icon={<Phone className="h-3.5 w-3.5" />}
                        label={source.phone}
                        href={`tel:${source.phone}`}
                      />
                    )}
                    {source.website && (
                      <InfoRow
                        icon={<Globe className="h-3.5 w-3.5" />}
                        label={(() => { try { return new URL(source.website).hostname.replace("www.", ""); } catch { return source.website; } })()}
                        href={source.website}
                        external
                      />
                    )}
                    {source.contact_form_url && (
                      <InfoRow
                        icon={<ExternalLink className="h-3.5 w-3.5" />}
                        label="Contact form"
                        href={source.contact_form_url}
                        external
                      />
                    )}
                    {!source.public_email && !source.phone && !source.website && !source.contact_form_url && (
                      <p className="text-xs text-muted-foreground">
                        No contact channels found. Try enriching this source.
                      </p>
                    )}
                  </div>
                </section>

                {/* Referral instructions */}
                {source.referral_instructions && (
                  <section className="grid gap-2">
                    <SectionHeading>Referral Instructions</SectionHeading>
                    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                      <p className="text-foreground/80">{source.referral_instructions}</p>
                    </div>
                  </section>
                )}

                {/* Contacts (people at the office) */}
                <section className="grid gap-3">
                  <SectionHeading>People</SectionHeading>
                  {source.contacts.length > 0 && (
                    <div className="grid gap-2">
                      {source.contacts.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{c.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {c.role.replace(/_/g, " ")}
                              {c.email && ` · ${c.email}`}
                            </p>
                          </div>
                          {c.is_primary && (
                            <Badge variant="secondary" className="ml-2 shrink-0 text-[10px]">
                              Primary
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline add contact */}
                  <div className="grid gap-2 rounded-lg border border-dashed p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <Input
                          className="h-8 text-sm"
                          placeholder="Dr. Smith"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <Input
                          className="h-8 text-sm"
                          placeholder="email@office.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">Role</Label>
                        <Select value={contactRole} onValueChange={setContactRole}>
                          <SelectTrigger className="h-8 w-40 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_CONTACT_ROLE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={handleAddContact}
                        disabled={isPending || !contactName.trim()}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add
                      </Button>
                    </div>
                  </div>
                </section>

                {/* Activity tabs */}
                <section className="grid gap-3">
                  <Tabs defaultValue="timeline">
                    <DashboardTabsList>
                      <DashboardTabsTrigger value="timeline">Timeline</DashboardTabsTrigger>
                      <DashboardTabsTrigger value="tasks">
                        Tasks
                        {openTaskCount > 0 && (
                          <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium leading-none text-muted-foreground">
                            {openTaskCount}
                          </span>
                        )}
                      </DashboardTabsTrigger>
                      <DashboardTabsTrigger value="notes">Notes</DashboardTabsTrigger>
                    </DashboardTabsList>

                    {/* Timeline */}
                    <TabsContent value="timeline" className="mt-3 space-y-3">
                      <div className="grid gap-2 rounded-lg border border-dashed p-3">
                        <div className="flex items-center gap-2">
                          <Select value={touchpointType} onValueChange={setTouchpointType}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {REFERRAL_TOUCHPOINT_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={touchpointOutcome} onValueChange={setTouchpointOutcome}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {REFERRAL_TOUCHPOINT_OUTCOME_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={handleLogTouchpoint} disabled={isPending}>
                            Log
                          </Button>
                        </div>
                        <Input
                          className="h-8 text-sm"
                          placeholder="Optional note about this interaction..."
                          value={touchpointNote}
                          onChange={(e) => setTouchpointNote(e.target.value)}
                        />
                      </div>

                      {source.touchpoints.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">No interactions recorded yet.</p>
                      ) : (
                        <div className="space-y-1">
                          {source.touchpoints.map((tp) => (
                            <div key={tp.id} className="rounded-lg border-l-2 border-muted-foreground/20 py-2 pl-3 pr-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium capitalize">{tp.touchpoint_type.replace(/_/g, " ")}</span>
                                  <Badge variant="outline" className="text-[10px] capitalize">{tp.outcome.replace(/_/g, " ")}</Badge>
                                </div>
                                <span className="shrink-0 text-[10px] text-muted-foreground">
                                  {new Date(tp.touched_at).toLocaleDateString()}
                                </span>
                              </div>
                              {tp.subject && <p className="mt-1 text-xs font-medium">{tp.subject}</p>}
                              {tp.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{tp.body}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* Tasks */}
                    <TabsContent value="tasks" className="mt-3 space-y-3">
                      <div className="flex items-end gap-2 rounded-lg border border-dashed p-3">
                        <div className="grid flex-1 gap-1">
                          <Label className="text-xs text-muted-foreground">Task</Label>
                          <Input className="h-8 text-sm" placeholder="Follow up on referral packet..." value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">Due</Label>
                          <Input type="date" className="h-8 w-36 text-sm" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
                        </div>
                        <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={handleAddTask} disabled={isPending || !taskTitle.trim()}>
                          <Plus className="mr-1 h-3 w-3" />
                          Add
                        </Button>
                      </div>

                      {source.tasks.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">No tasks yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {source.tasks.map((task) => (
                            <div key={task.id} className="flex items-start justify-between rounded-lg border px-3 py-2.5">
                              <div className="min-w-0">
                                <p className={cn("truncate text-sm font-medium", task.status === "completed" && "text-muted-foreground line-through")}>{task.title}</p>
                                {task.due_date && <p className="text-xs text-muted-foreground">Due {new Date(task.due_date).toLocaleDateString()}</p>}
                              </div>
                              <Badge variant={task.status === "completed" ? "secondary" : "outline"} className="ml-2 shrink-0 text-[10px] capitalize">{task.status.replace(/_/g, " ")}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* Notes */}
                    <TabsContent value="notes" className="mt-3 space-y-3">
                      <div className="grid gap-2 rounded-lg border border-dashed p-3">
                        <Textarea className="min-h-[72px] text-sm" placeholder="Add a note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} />
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" className="h-8" onClick={handleAddNote} disabled={isPending || !noteText.trim()}>
                            <Plus className="mr-1 h-3 w-3" />
                            Add Note
                          </Button>
                        </div>
                      </div>

                      {source.notes.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">No notes yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {source.notes.map((n) => (
                            <div key={n.id} className="rounded-lg border px-3 py-2.5">
                              <p className="whitespace-pre-wrap text-sm">{n.note}</p>
                              <p className="mt-1.5 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </section>
              </div>
            </div>

            {/* ───── Footer ───── */}
            <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
              {source.phone && (
                <Button size="sm" variant="outline" asChild>
                  <a href={`tel:${source.phone}`}>
                    <Phone className="mr-1.5 h-3.5 w-3.5" />
                    Call
                  </a>
                </Button>
              )}
              <Button size="sm" onClick={() => onSendEmail(source.id, source.name)}>
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Send Email
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ─────────────────────────── sub-components ────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function InfoRow({
  icon,
  label,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  external?: boolean;
}) {
  const inner = (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className={cn("truncate", href ? "text-foreground underline decoration-muted-foreground/40 hover:decoration-foreground" : "text-foreground")}>
        {label}
      </span>
    </div>
  );

  if (href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="block">
        {inner}
      </a>
    );
  }

  return inner;
}

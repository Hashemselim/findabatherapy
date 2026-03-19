"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, Phone, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  addReferralNote,
  enrichReferralSource,
  logReferralTouchpoint,
  saveReferralContact,
  saveReferralTask,
  updateReferralSourceStage,
  type ReferralSourceDetail,
  type ReferralTemplate,
} from "@/lib/actions/referrals";
import { REFERRAL_SOURCE_STAGE_OPTIONS, REFERRAL_TOUCHPOINT_OUTCOME_OPTIONS, REFERRAL_TOUCHPOINT_TYPE_OPTIONS } from "@/lib/validations/referrals";
import { formatDistance } from "@/lib/geo/distance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ReferralStageBadge } from "./referral-stage-badge";
import { ReferralSendDialog } from "./referral-send-dialog";

export function ReferralSourceDetailClient({
  source,
  templates,
}: {
  source: ReferralSourceDetail;
  templates: ReferralTemplate[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [touchpointType, setTouchpointType] = useState("call");
  const [touchpointOutcome, setTouchpointOutcome] = useState("connected");
  const [touchpointBody, setTouchpointBody] = useState("");
  const [sendOpen, setSendOpen] = useState(false);

  function refresh() {
    router.refresh();
  }

  function handleStageChange(nextStage: string) {
    startTransition(async () => {
      const result = await updateReferralSourceStage(source.id, nextStage as never);
      if (!result.success) {
        toast.error(result.error || "Failed to update stage");
        return;
      }
      toast.success("Stage updated");
      refresh();
    });
  }

  function handleEnrich() {
    startTransition(async () => {
      const result = await enrichReferralSource(source.id);
      if (!result.success) {
        toast.error(result.error || "Failed to enrich source");
        return;
      }
      toast.success("Source enriched");
      refresh();
    });
  }

  function handleAddNote() {
    if (!note.trim()) {
      toast.error("Note cannot be empty");
      return;
    }

    startTransition(async () => {
      const result = await addReferralNote({ sourceId: source.id, note });
      if (!result.success) {
        toast.error(result.error || "Failed to save note");
        return;
      }
      toast.success("Note saved");
      setNote("");
      refresh();
    });
  }

  function handleAddTask() {
    if (!taskTitle.trim()) {
      toast.error("Task title is required");
      return;
    }

    startTransition(async () => {
      const result = await saveReferralTask({
        sourceId: source.id,
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
    if (!contactName.trim()) {
      toast.error("Contact name is required");
      return;
    }

    startTransition(async () => {
      const result = await saveReferralContact({
        sourceId: source.id,
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        role: "other",
        isPrimary: source.contacts.length === 0,
      });
      if (!result.success) {
        toast.error(result.error || "Failed to save contact");
        return;
      }
      toast.success("Contact added");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      refresh();
    });
  }

  function handleLogTouchpoint() {
    startTransition(async () => {
      const result = await logReferralTouchpoint({
        sourceId: source.id,
        touchpointType: touchpointType as never,
        outcome: touchpointOutcome as never,
        body: touchpointBody,
      });
      if (!result.success) {
        toast.error(result.error || "Failed to save touchpoint");
        return;
      }
      toast.success("Touchpoint logged");
      setTouchpointBody("");
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{source.name}</CardTitle>
            <CardDescription>
              {source.category.replace(/_/g, " ")}
              {source.city || source.state ? ` • ${[source.city, source.state].filter(Boolean).join(", ")}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <ReferralStageBadge stage={source.stage} />
              <p className="text-sm text-muted-foreground">
                {source.distance_miles != null ? formatDistance(source.distance_miles) : "No distance"}
              </p>
              <p className="text-sm text-muted-foreground">Priority {source.priority_score}/100</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={source.stage} onValueChange={handleStageChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERRAL_SOURCE_STAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Best contact method</Label>
                <p className="rounded-md border px-3 py-2 text-sm">{source.contactability.replace(/_/g, " ")}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Email</p>
                <p className="text-muted-foreground">{source.public_email || "Not found yet"}</p>
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Phone</p>
                <p className="text-muted-foreground">{source.phone || "Not found yet"}</p>
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Website</p>
                {source.website ? (
                  <a href={source.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {source.website}
                  </a>
                ) : (
                  <p className="text-muted-foreground">Not found yet</p>
                )}
              </div>
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Contact form</p>
                {source.contact_form_url ? (
                  <a href={source.contact_form_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Open contact form
                  </a>
                ) : (
                  <p className="text-muted-foreground">Not found yet</p>
                )}
              </div>
            </div>

            {source.referral_instructions ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Referral instructions</p>
                <p className="mt-1 text-muted-foreground">{source.referral_instructions}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setSendOpen(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Send Intro
              </Button>
              <Button variant="outline" onClick={handleEnrich} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Enrich
              </Button>
              {source.phone ? (
                <Button asChild variant="outline">
                  <a href={`tel:${source.phone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call
                  </a>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Add</CardTitle>
            <CardDescription>Capture what happens so the relationship does not get lost.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Add note</Label>
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} />
              <Button onClick={handleAddNote} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Save Note
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Add follow-up task</Label>
              <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Call office manager" />
              <Input type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} />
              <Button variant="outline" onClick={handleAddTask} disabled={isPending}>
                Add Task
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Add contact</Label>
              <Input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Jane Smith" />
              <Input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="jane@example.com" />
              <Input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="(555) 555-5555" />
              <Button variant="outline" onClick={handleAddContact} disabled={isPending}>
                Add Contact
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Log touchpoint</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[160px_160px_1fr_auto]">
              <Select value={touchpointType} onValueChange={setTouchpointType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_TOUCHPOINT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={touchpointOutcome} onValueChange={setTouchpointOutcome}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_TOUCHPOINT_OUTCOME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={touchpointBody}
                onChange={(event) => setTouchpointBody(event.target.value)}
                rows={2}
                placeholder="Spoke with front desk. Asked for referral coordinator email."
              />
              <Button onClick={handleLogTouchpoint} disabled={isPending}>
                Save
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {source.touchpoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">No touchpoints recorded yet.</p>
              ) : (
                source.touchpoints.map((touchpoint) => (
                  <div key={touchpoint.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <ReferralStageBadge stage={source.stage} />
                      <p className="font-medium">{touchpoint.touchpoint_type.replace(/_/g, " ")}</p>
                      <p className="text-muted-foreground">{touchpoint.outcome.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(touchpoint.touched_at).toLocaleString()}
                      </p>
                    </div>
                    {touchpoint.subject ? <p className="mt-2 font-medium">{touchpoint.subject}</p> : null}
                    {touchpoint.body ? <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{touchpoint.body}</p> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {source.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts added yet.</p>
              ) : (
                source.contacts.map((contact) => (
                  <div key={contact.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-muted-foreground">
                      {[contact.title, contact.role.replace(/_/g, " ")].filter(Boolean).join(" • ")}
                    </p>
                    <p>{contact.email || "No email"}</p>
                    <p>{contact.phone || "No phone"}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {source.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks yet.</p>
              ) : (
                source.tasks.map((task) => (
                  <div key={task.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.status.replace(/_/g, " ")}</p>
                    </div>
                    {task.content ? <p className="mt-1 text-muted-foreground">{task.content}</p> : null}
                    {task.due_date ? <p className="mt-1 text-xs text-muted-foreground">Due {task.due_date}</p> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {source.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                source.notes.map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-3 text-sm">
                    <p className="whitespace-pre-wrap">{entry.note}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ReferralSendDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        templates={templates}
        sourceIds={[source.id]}
        sourceName={source.name}
      />
    </div>
  );
}

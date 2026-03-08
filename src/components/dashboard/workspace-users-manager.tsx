"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, MoreHorizontal, Plus, Shield, UserMinus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inviteWorkspaceUser,
  removeWorkspaceUser,
  resendWorkspaceInvitation,
  revokeWorkspaceInvitation,
  updateWorkspaceUserRole,
  type WorkspaceUsersPayload,
} from "@/lib/actions/workspace-users";

interface WorkspaceUsersManagerProps {
  data: WorkspaceUsersPayload;
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(value: string | null) {
  if (!value) return "Not yet joined";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function WorkspaceUsersManager({ data }: WorkspaceUsersManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [error, setError] = useState<string | null>(null);

  const canInvite = data.currentMembership.role === "owner" || data.currentMembership.role === "admin";
  const canChangeRoles = data.currentMembership.role === "owner";
  const canRemoveAdmins = data.currentMembership.role === "owner";

  function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.success) {
        setError(result.error || "Something went wrong");
        return;
      }
      router.refresh();
    });
  }

  function handleInvite() {
    runAction(async () => {
      const result = await inviteWorkspaceUser(email, role);
      if (result.success) {
        setDialogOpen(false);
        setEmail("");
        setRole("member");
      }
      return result;
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total seats</CardDescription>
            <CardTitle>{data.seatSummary.maxSeats}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Used now</CardDescription>
            <CardTitle>{data.seatSummary.usedSeats}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending invites</CardDescription>
            <CardTitle>{data.seatSummary.pendingSeats}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available</CardDescription>
            <CardTitle>{data.seatSummary.availableSeats}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Workspace Users</CardTitle>
            <CardDescription>
              Shared account users for {data.workspaceName}. Employees stay separate from account access.
            </CardDescription>
          </div>
          {canInvite && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite account user</DialogTitle>
                  <DialogDescription>
                    Invitations use one available seat immediately and expire after 7 days.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={role} onValueChange={(value: "admin" | "member") => setRole(value)}>
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleInvite}
                    disabled={isPending || !email || data.seatSummary.availableSeats < 1}
                  >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                    Send invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && !dialogOpen && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-border/60">
            <div className="border-b border-border/60 px-4 py-3 text-sm font-medium">Active users</div>
            {data.members.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No workspace users yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {data.members.map((member) => (
                  <div key={member.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-foreground">{member.email}</p>
                        {member.isCurrentUser && <Badge variant="outline">You</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatRole(member.role)}</span>
                        <span>·</span>
                        <span>{formatDate(member.joinedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                        {formatRole(member.role)}
                      </Badge>
                      {(canChangeRoles || canRemoveAdmins || member.role === "member") && !member.isCurrentUser && member.role !== "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canChangeRoles && (
                              <>
                                <DropdownMenuItem onClick={() => runAction(() => updateWorkspaceUserRole(member.id, "member"))}>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Make member
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => runAction(() => updateWorkspaceUserRole(member.id, "admin"))}>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Make admin
                                </DropdownMenuItem>
                              </>
                            )}
                            {(member.role === "member" || canRemoveAdmins) && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => runAction(() => removeWorkspaceUser(member.id))}
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                Remove user
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/60">
            <div className="border-b border-border/60 px-4 py-3 text-sm font-medium">Invitations</div>
            {data.invitations.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No invitations yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {data.invitations.map((invite) => (
                  <div key={invite.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{invite.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatRole(invite.role)}</span>
                        <span>·</span>
                        <span>{formatRole(invite.status)}</span>
                        <span>·</span>
                        <span>Expires {formatDate(invite.expiresAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{formatRole(invite.status)}</Badge>
                      {canInvite && (invite.status === "pending" || invite.status === "expired") && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => runAction(() => resendWorkspaceInvitation(invite.id))}>
                            Resend
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => runAction(() => revokeWorkspaceInvitation(invite.id))}>
                            Revoke
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-slate-700">
            <div className="flex items-center gap-2 font-medium text-slate-900">
              <Users className="h-4 w-4" />
              Seats are separate from Employees
            </div>
            <p className="mt-1">
              Account users can sign in and work in the shared dashboard. Employees remain internal staffing records.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

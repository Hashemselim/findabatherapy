"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type { PortalGuardianData } from "@/lib/actions/client-portal";
import { savePortalGuardian } from "@/lib/actions/client-portal";
import { ACCESS_STATUS_OPTIONS } from "../portal-constants";

interface PortalGuardianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  guardian?: PortalGuardianData;
  onSuccess?: () => void;
}

export function PortalGuardianDialog({
  open,
  onOpenChange,
  clientId,
  guardian,
  onSuccess,
}: PortalGuardianDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!guardian;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [accessStatus, setAccessStatus] = useState("draft");
  const [isPrimary, setIsPrimary] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (open) {
      setFirstName(guardian?.firstName ?? "");
      setLastName(guardian?.lastName ?? "");
      setEmail(guardian?.email ?? "");
      setPhone(guardian?.phone ?? "");
      setRelationship(guardian?.relationship ?? "");
      setAccessStatus(guardian?.accessStatus ?? "draft");
      setIsPrimary(guardian?.isPrimary ?? false);
      setNotificationsEnabled(guardian?.notificationsEnabled ?? true);
    }
  }, [open, guardian]);

  const isValid = firstName.trim().length > 0 && lastName.trim().length > 0;

  function handleSubmit() {
    startTransition(async () => {
      const result = await savePortalGuardian({
        recordId: guardian?.id,
        clientId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        relationship: relationship.trim() || null,
        isPrimary,
        notificationsEnabled,
        accessStatus,
      });

      if (result.success) {
        toast.success(isEditing ? "Guardian updated" : "Guardian added");
        router.refresh();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit guardian" : "Add guardian"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guardian-first-name">First name</Label>
              <Input
                id="guardian-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardian-last-name">Last name</Label>
              <Input
                id="guardian-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guardian-email">Email</Label>
              <Input
                id="guardian-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardian-phone">Phone</Label>
              <Input
                id="guardian-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian-relationship">Relationship</Label>
            <Input
              id="guardian-relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. Mother, Father, Legal Guardian"
            />
          </div>

          <div className="space-y-2">
            <Label>Access status</Label>
            <Select value={accessStatus} onValueChange={setAccessStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="guardian-primary">Primary guardian</Label>
            <Switch
              id="guardian-primary"
              checked={isPrimary}
              onCheckedChange={setIsPrimary}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="guardian-notifications">Email notifications</Label>
            <Switch
              id="guardian-notifications"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button disabled={isPending || !isValid} onClick={handleSubmit}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

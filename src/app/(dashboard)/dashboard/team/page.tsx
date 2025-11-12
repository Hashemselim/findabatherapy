import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const teamMembers = [
  { name: "Alex Martinez", email: "alex@thrivespectrumaba.com", role: "Owner", status: "Active" },
  { name: "Jordan Ellis", email: "jordan@thrivespectrumaba.com", role: "Billing admin", status: "Invited" },
  { name: "Riley Chen", email: "riley@thrivespectrumaba.com", role: "Clinical director", status: "Active" },
];

export default function DashboardTeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Team & access</h1>
          <p className="mt-2 text-sm text-slate-300">
            Invite teammates to manage listings, billing, and analytics. Role-based access is powered by Supabase.
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Invite teammate</Button>
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Current team</CardTitle>
          <CardDescription className="text-slate-300">
            Manage access levels and pending invitations. Featured partners can target offers based on roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {teamMembers.map((member) => (
            <div
              key={member.email}
              className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] p-3 text-sm text-slate-300"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-white">{member.name}</p>
                  <p className="text-xs text-slate-300">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-white/20 text-slate-200">
                  {member.role}
                </Badge>
                <span className="text-xs uppercase text-slate-400">{member.status}</span>
                <Button variant="ghost" size="sm" className="text-slate-200 hover:bg-white/10">
                  Manage
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

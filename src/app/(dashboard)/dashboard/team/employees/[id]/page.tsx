import { notFound } from "next/navigation";

import { getTeamMember } from "@/lib/actions/team";
import { TeamMemberDetail } from "./team-member-detail";

interface TeamMemberPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamMemberPage({ params }: TeamMemberPageProps) {
  const { id } = await params;
  const result = await getTeamMember(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <TeamMemberDetail
      member={result.data.member}
      initialCredentials={result.data.credentials}
      initialDocuments={result.data.documents}
      initialTasks={result.data.tasks}
    />
  );
}

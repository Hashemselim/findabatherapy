import { redirect } from "next/navigation";

interface ClientPortalManagerPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientPortalManagerPage({
  params,
}: ClientPortalManagerPageProps) {
  const { id } = await params;
  // Portal management is now integrated into the main client page Settings tab
  redirect(`/dashboard/clients/${id}`);
}

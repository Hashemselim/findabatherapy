import { redirect } from "next/navigation";

interface DashboardOverviewPageProps {
  searchParams?: Promise<{ welcome?: string }>;
}

export default async function DashboardOverviewPage({
  searchParams,
}: DashboardOverviewPageProps) {
  const params = searchParams ? await searchParams : undefined;
  redirect(
    params?.welcome === "1"
      ? "/dashboard/clients/pipeline?welcome=1"
      : "/dashboard/clients/pipeline"
  );
}

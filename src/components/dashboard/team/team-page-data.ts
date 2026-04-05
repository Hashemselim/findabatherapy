import { getApplications, type ApplicationSummary } from "@/lib/actions/applications";
import { getJobPostings, type JobPostingSummary } from "@/lib/actions/jobs";
import { getTeamMembers, type TeamMember } from "@/lib/actions/team";
import { DEMO_EMPLOYEES } from "@/lib/demo/data";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { getProfile } from "@/lib/platform/workspace/server";

interface TeamPageData {
  onboardingComplete: boolean;
  isPreview: boolean;
  applications: ApplicationSummary[];
  newApplicantCount: number;
  jobs: JobPostingSummary[];
  teamMembers: TeamMember[];
  teamGated: boolean;
}

export async function getTeamPageData(): Promise<TeamPageData> {
  const profile = await getProfile();

  if (!profile?.onboarding_completed_at) {
    return {
      onboardingComplete: false,
      isPreview: false,
      applications: [],
      newApplicantCount: 0,
      jobs: [],
      teamMembers: [],
      teamGated: false,
    };
  }

  const isPreview = (await getCurrentPlanTier()) === "free";

  if (isPreview) {
    return {
      onboardingComplete: true,
      isPreview: true,
      applications: [],
      newApplicantCount: 0,
      jobs: [],
      teamMembers: DEMO_EMPLOYEES,
      teamGated: false,
    };
  }

  const [applicationsResult, jobsResult, teamResult] = await Promise.all([
    getApplications(),
    getJobPostings(),
    getTeamMembers(),
  ]);

  return {
    onboardingComplete: true,
    isPreview: false,
    applications: applicationsResult.success ? applicationsResult.data?.applications || [] : [],
    newApplicantCount: applicationsResult.success ? applicationsResult.data?.newCount || 0 : 0,
    jobs: jobsResult.success ? jobsResult.data || [] : [],
    teamMembers: teamResult.success ? teamResult.data || [] : [],
    teamGated: !teamResult.success,
  };
}

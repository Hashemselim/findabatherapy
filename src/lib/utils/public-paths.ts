function withOptionalSuffix(base: string, suffix?: string): string {
  if (!suffix) return base;
  return `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

export function getProviderBrochurePath(slug: string): string {
  return `/provider/${slug}`;
}

export function getProviderWebsitePath(slug: string, suffix?: string): string {
  return withOptionalSuffix(`/provider/${slug}/website`, suffix);
}

export function getProviderContactPath(slug: string): string {
  return `/provider/${slug}/contact`;
}

export function getProviderIntakePath(slug: string): string {
  return `/provider/${slug}/intake`;
}

export function getProviderResourcesPath(
  slug: string,
  suffix?: string
): string {
  return withOptionalSuffix(`/provider/${slug}/resources`, suffix);
}

export function getProviderCareersPath(slug: string): string {
  return `/provider/${slug}/careers`;
}

export function getProviderJobPath(slug: string, jobSlug: string): string {
  return `/provider/${slug}/jobs/${jobSlug}`;
}

export function getJobsPostPath(slug: string): string {
  return `/jobs/post/${slug}`;
}

export function getJobsRolePath(position: string): string {
  return `/jobs/role/${position}`;
}

export function getJobsEmployersPath(suffix?: string): string {
  return withOptionalSuffix("/jobs/employers", suffix);
}

import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://us.i.posthog.com",
  person_profiles: "identified_only",
  capture_pageview: "history_change",
  capture_pageleave: true,
});

export default posthog;

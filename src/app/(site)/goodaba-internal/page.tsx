import type { Metadata } from "next";

import GoodabaLandingPage, {
  metadata as landingMetadata,
} from "@/app/(site)/_goodaba/goodaba-landing-page";

export const metadata: Metadata = {
  ...landingMetadata,
  title: {
    absolute: "GoodABA | Attract, Intake & Manage ABA Families - One Platform",
  },
};

export default GoodabaLandingPage;

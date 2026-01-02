"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoCTABanner } from "@/components/demo/demo-cta-banner";
import { PhotoGalleryManager } from "@/components/dashboard/photo-gallery-manager";
import { VideoEmbedForm } from "@/components/dashboard/video-embed-form";
import { useDemoContext } from "@/contexts/demo-context";
import { DEMO_LISTING, DEMO_PHOTOS } from "@/lib/demo/data";

export default function DemoMediaPage() {
  const { showDemoToast } = useDemoContext();

  const handleDemoAction = () => {
    showDemoToast("Media management is disabled in demo mode");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Media
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
          Showcase your practice with photos and video to help families get to know you.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        <PhotoGalleryManager
          planTier={DEMO_LISTING.profile.planTier}
          isDemo={true}
          demoPhotos={DEMO_PHOTOS}
          onDemoAction={handleDemoAction}
          dataTour="photo-gallery"
        />
        <VideoEmbedForm
          planTier={DEMO_LISTING.profile.planTier}
          isDemo={true}
          demoVideoUrl={DEMO_LISTING.videoUrl}
          onDemoAction={handleDemoAction}
          dataTour="video-embed"
        />
      </div>

      {/* Tips Card */}
      <Card className="border-[#5788FF]/30 bg-[#5788FF]/5">
        <CardHeader>
          <CardTitle className="text-base">Tips for Great Media</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-[#5788FF]">•</span>
              Use high-quality photos of your therapy spaces, team, and equipment
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#5788FF]">•</span>
              Include photos that show the welcoming environment for families
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#5788FF]">•</span>
              Video introductions help families feel connected before reaching out
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#5788FF]">•</span>
              Listings with photos get 40% more engagement
            </li>
          </ul>
        </CardContent>
      </Card>

      <DemoCTABanner />
    </div>
  );
}

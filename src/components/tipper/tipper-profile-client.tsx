/* eslint-disable @typescript-eslint/no-explicit-any */

import Footer from "@/components/shared/footer";
import { TipperBanner } from "./tipper-banner";
import { ProfileTabs } from "./profile-tabs";
import type { Content } from "@/types/content.types";

type Cause = {
  id: string;
  logoUrl: string;
  name: string;
};



export type TippedVideoSummary = {
  videoChannelId: string;
  videoTitle: string | null;
  videoDurationSeconds: number | null;
  eventId: string | null;
  eventName: string | null;
  tipCount: number;
  totalAmount: number;
  lastTippedAt: string;
  paymentSurfaces: string[];
};

interface Props {
  events: any[];
  iTipped: number;
  causes: Cause[];
  contents?: Content[];
  tippedVideos?: TippedVideoSummary[];
  viewMode?: "owner" | "public" | "drawer";
  profileSlug?: string;
  displayName?: string;
  isAnonymous?: boolean;
}

export const TipperProfileClient = ({
  events,
  iTipped,
  causes,
  contents,
  tippedVideos = [],
  viewMode = "owner",
  profileSlug,
  displayName,
  isAnonymous,
}: Props) => {
  const isDrawer = viewMode === "drawer";
  const bannerVariant =
    viewMode === "public" ? "public" : isDrawer ? "drawer" : "owner";
  const tabsVariant =
    viewMode === "public" ? "public" : isDrawer ? "drawer" : "owner";

  return (
    <>
      <TipperBanner
        iTipped={iTipped}
        variant={bannerVariant}
        profileSlug={profileSlug}
        displayName={displayName}
        isAnonymous={isAnonymous}
      />

      <section
        className={
          isDrawer
            ? "flex w-full flex-col items-center px-2 pb-6"
            : "flex w-full flex-col items-center bg-cover bg-center bg-no-repeat px-2 py-6 sm:px-4 lg:py-10"
        }
        style={
          isDrawer
            ? undefined
            : {
                backgroundImage: `url(/vectors/tipping_pattern_new.webp)`,
              }
        }
      >
        <ProfileTabs
          events={events}
          causes={causes}
          contents={contents}
          tippedVideos={tippedVideos}
          variant={tabsVariant}
          totalTipped={iTipped}
        />
        {isDrawer && profileSlug ? (
          <a
            href={`/tipper/${profileSlug}`}
            className="text-primary mt-4 text-sm font-medium underline underline-offset-2"
          >
            Open full profile
          </a>
        ) : null}
      </section>

      {!isDrawer ? <Footer /> : null}
    </>
  );
};

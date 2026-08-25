/* eslint-disable @typescript-eslint/no-explicit-any */

import Footer from "@/components/shared/footer";
import { TipperBanner } from "./tipper-banner";
import { ProfileTabs } from "./profile-tabs";

type Cause = {
  id: string;
  logoUrl: string;
  name: string;
};

type Content = {
  id: string;
  url: string;
  event: {
    eventType: string;
  };
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
  variant?: "page" | "drawer";
}

export const TipperProfileClient = ({
  events,
  iTipped,
  causes,
  contents,
  tippedVideos = [],
  variant = "page",
}: Props) => {
  const isDrawer = variant === "drawer";

  return (
    <>
      <TipperBanner iTipped={iTipped} />

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
          variant={variant}
        />
      </section>

      {!isDrawer ? <Footer /> : null}
    </>
  );
};

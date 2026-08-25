/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getMyTippedVideos,
  getSavedVideosForTipper,
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import {
  TippedVideoSummary,
  TipperProfileClient,
} from "@/components/tipper/tipper-profile-client";
import { ProtectedRoute } from "@/components/protected-route";
import { getToken } from "@/lib/getToken";
import { getAllCausesAction } from "@/actions/home";
import { Cause } from "@/types/cause.types";
import { Content } from "@/types/content.types";
import type { Metadata } from "next";
import { NavbarShell } from "@/components/shared/navbar-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function TipperProfile() {
  const token = await getToken();

  // Fetch all data in parallel
  const [eventsRes, iTippedRes, causesRes, contentsRes, videosRes] =
    await Promise.all([
      getTippedEventsForTipper(token!),
      getTotalAmountTippedByTipper(token!),
      getAllCausesAction(),
      getSavedVideosForTipper(token!),
      getMyTippedVideos(token!),
    ]);

  const events = eventsRes.data;
  const iTipped = iTippedRes.data;
  const causes = causesRes.data;
  const contents = contentsRes.data;
  const tippedVideos = videosRes.data;

  return (
    <ProtectedRoute>
      <div className="overflow-y-auto">
        <NavbarShell />
        <TipperProfileClient
          events={events as any[]}
          iTipped={iTipped as number}
          causes={causes as Cause[]}
          contents={contents as unknown as any[]}
          tippedVideos={tippedVideos as TippedVideoSummary[]}
        />
      </div>
    </ProtectedRoute>
  );
}

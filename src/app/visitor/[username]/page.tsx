import {
  getMyTippedVideos,
  getTippedEventsForVisitor,
  getTotalAmountTippedByVisitor,
} from "@/actions/events";
import { VisitorProfileClient } from "@/components/tipper/visitor-profile-client";
import { ProtectedRoute } from "@/components/protected-route";
import { getToken } from "@/lib/getToken";
import { TippedVideoSummary } from "@/components/tipper/tipper-profile-client";
import { Event } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function VisitorProfile() {
  const token = await getToken();

  // Fetch all data in parallel
  const [eventsRes, iTippedRes, tippedVideosRes] = await Promise.all([
    getTippedEventsForVisitor(token!),
    getTotalAmountTippedByVisitor(token!),
    getMyTippedVideos(token!),
  ]);

  const events = (eventsRes.data ?? []) as Event[];
  const iTipped = iTippedRes.data as number;
  const tippedVideos = tippedVideosRes.data ?? [];

  return (
    <ProtectedRoute>
      <VisitorProfileClient
        events={events}
        iTipped={iTipped}
        tippedVideos={tippedVideos as TippedVideoSummary[]}
      />
    </ProtectedRoute>
  );
}

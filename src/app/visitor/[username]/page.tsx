import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

import {
  getMyTippedVideos,
  getTippedEventsForVisitor,
  getTotalAmountTippedByVisitor,
} from "@/actions/events";
import { getPublicTipperProfileAction } from "@/actions/tipper-profile";
import { VisitorProfileClient } from "@/components/tipper/visitor-profile-client";
import { getToken } from "@/lib/getToken";
import { getServerSessionUser } from "@/lib/getUser";
import { isProfileOwner } from "@/lib/tipper-profile-owner";
import type { TippedVideoSummary } from "@/components/tipper/tipper-profile-client";
import type { Event } from "@/types";

type Props = {
  params: Promise<{ username: string }>;
};

async function loadProfile(slug: string) {
  const res = await getPublicTipperProfileAction(slug);
  if (!res.success || !res.data) return null;
  return res;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const loaded = await loadProfile(username);
  if (!loaded?.data) {
    return {
      title: "Visitor profile · Tipmanna",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: "Visitor · Tipmanna",
    description: "Temporary visitor tipping profile on Tipmanna.",
    robots: { index: false, follow: false },
  };
}

export default async function VisitorProfilePage({ params }: Props) {
  const { username } = await params;
  const loaded = await loadProfile(username);

  if (!loaded?.data) {
    notFound();
  }

  if (loaded.redirectSlug && loaded.redirectSlug !== username) {
    permanentRedirect(`/visitor/${loaded.redirectSlug}`);
  }

  const profile = loaded.data;
  if (profile.kind === "tipper") {
    permanentRedirect(`/tipper/${profile.profileSlug}`);
  }

  const sessionUser = await getServerSessionUser();
  const isOwner = isProfileOwner(sessionUser, profile);

  let events = profile.events as Event[];
  let iTipped = profile.totalTipped;
  let tippedVideos = profile.videos as TippedVideoSummary[];

  if (isOwner) {
    const token = await getToken();
    if (token) {
      const [eventsRes, iTippedRes, videosRes] = await Promise.all([
        getTippedEventsForVisitor(token),
        getTotalAmountTippedByVisitor(token),
        getMyTippedVideos(token),
      ]);
      if (Array.isArray(eventsRes.data)) events = eventsRes.data as Event[];
      if (typeof iTippedRes.data === "number") iTipped = iTippedRes.data;
      if (Array.isArray(videosRes.data)) {
        tippedVideos = videosRes.data as TippedVideoSummary[];
      }
    }
  }

  return (
    <VisitorProfileClient
      events={events}
      iTipped={iTipped}
      tippedVideos={tippedVideos}
      viewMode={isOwner ? "owner" : "public"}
      profileSlug={profile.profileSlug}
      profileId={profile.profileId}
    />
  );
}

import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

import {
  getMyTippedVideos,
  getSavedVideosForTipper,
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import { getPublicTipperProfileAction } from "@/actions/tipper-profile";
import { TipperProfileClient } from "@/components/tipper/tipper-profile-client";
import { getAllCausesAction } from "@/actions/home";
import { getToken } from "@/lib/getToken";
import { getServerSessionUser } from "@/lib/getUser";
import { NavbarShell } from "@/components/shared/navbar-shell";
import type { Cause } from "@/types/cause.types";

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
      title: "Tipper profile · Tipmanna",
      robots: { index: false, follow: false },
    };
  }

  const profile = loaded.data;
  const label = profile.isAnonymous ? "Anonymous" : profile.publicLabel;

  return {
    title: `${label} · Tipmanna Tipper`,
    description: `View tipping history and milestones for ${label} on Tipmanna.`,
    robots: profile.isVisitor
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export default async function TipperProfilePage({ params }: Props) {
  const { username } = await params;
  const loaded = await loadProfile(username);

  if (!loaded?.data) {
    notFound();
  }

  if (loaded.redirectSlug && loaded.redirectSlug !== username) {
    permanentRedirect(`/tipper/${loaded.redirectSlug}`);
  }

  const profile = loaded.data;
  if (profile.kind === "visitor") {
    permanentRedirect(`/visitor/${profile.profileSlug}`);
  }

  const sessionUser = await getServerSessionUser();
  const isOwner =
    sessionUser?.role === "TIPPER" &&
    sessionUser.username.toLowerCase() === profile.profileSlug.toLowerCase();

  let events = profile.events;
  let iTipped = profile.totalTipped;
  let tippedVideos = profile.videos;
  let causes: Cause[] = [];
  let contents: unknown[] = [];

  if (isOwner) {
    const token = await getToken();
    if (token) {
      const [eventsRes, iTippedRes, causesRes, contentsRes, videosRes] =
        await Promise.all([
          getTippedEventsForTipper(token),
          getTotalAmountTippedByTipper(token),
          getAllCausesAction(),
          getSavedVideosForTipper(token),
          getMyTippedVideos(token),
        ]);

      if (Array.isArray(eventsRes.data)) events = eventsRes.data;
      if (typeof iTippedRes.data === "number") iTipped = iTippedRes.data;
      if (Array.isArray(causesRes.data)) causes = causesRes.data as Cause[];
      if (Array.isArray(contentsRes.data)) contents = contentsRes.data;
      if (Array.isArray(videosRes.data)) tippedVideos = videosRes.data;
    }
  }

  return (
    <div className="overflow-y-auto">
      <NavbarShell />
      <TipperProfileClient
        events={events}
        iTipped={iTipped}
        causes={causes}
        contents={contents as any[]}
        tippedVideos={tippedVideos}
        viewMode={isOwner ? "owner" : "public"}
        profileSlug={profile.profileSlug}
        displayName={profile.publicLabel}
        isAnonymous={profile.isAnonymous}
      />
    </div>
  );
}

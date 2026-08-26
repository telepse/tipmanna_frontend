import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getPublicPlaylistAction } from "@/actions/host-playlist";
import { PlaylistPageClient } from "@/components/playlist/playlist-page-client";
import { getToken } from "@/lib/getToken";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const res = await getPublicPlaylistAction(id);
  if (!res.success || !res.data) {
    return { title: "Playlist · Tipmanna" };
  }
  const pl = res.data.playlist;
  return {
    title: `${pl.name} · Playlist`,
    description: pl.description ?? `Video playlist by @${pl.host.username}`,
  };
}

export default async function PlaylistPage({ params }: Props) {
  const { id } = await params;
  const token = await getToken();
  const res = await getPublicPlaylistAction(id, token ?? undefined);
  if (!res.success || !res.data) {
    notFound();
  }
  return (
    <PlaylistPageClient
      playlist={res.data.playlist}
      locked={res.data.locked}
      requiresMembership={res.data.requiresMembership}
    />
  );
}

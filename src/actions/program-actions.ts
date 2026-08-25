"use server";

import { getContentChannelAction } from "@/actions/contents";
import {
  fetchCommunityProgramBootstrap,
  fetchGlobalProgramBootstrap,
} from "@/lib/program-api";
import type { ProgramBootstrap } from "@/lib/program-types";
import { runServerFetch, type ActionResult } from "@/lib/action-fetch";
import { serverAuthHeaders, serverHostAuthHeaders } from "@/lib/server-auth";

/** Resolve ordered playable channel rows for “Watch all” on the `/content/[eventId]` surface. */
export async function resolveProgramWatchAllPlaylist(
  _routeEventId: string,
  enforcementId: string,
  communityId: string | null,
  authToken?: string | null
): Promise<{ playlist: unknown[]; canonicalEventId: string } | null> {
  let program: ProgramBootstrap | null = null;

  const eid = enforcementId.trim();
  const cid = communityId?.trim() ?? "";

  if (cid) {
    program = await fetchCommunityProgramBootstrap(cid, eid);
  } else {
    program = await fetchGlobalProgramBootstrap(eid);
  }

  if (!program?.items?.length) return null;

  const ordered = [...program.items].sort((a, b) => a.position - b.position);
  const playable = ordered.filter(
    i => Boolean(i.contentUrl) && Boolean(i.channelId)
  );

  if (playable.length === 0) return null;

  const distinctEventIds = [...new Set(playable.map(i => String(i.eventId)))];
  const byEventId: Record<string, unknown[]> = {};

  await Promise.all(
    distinctEventIds.map(async evId => {
      const res = await getContentChannelAction(evId, authToken ?? null);
      byEventId[evId] = res.success && Array.isArray(res.data) ? res.data : [];
    })
  );

  const playlist: unknown[] = [];
  for (const item of playable) {
    const evKey = String(item.eventId);
    const rows = byEventId[evKey];
    if (!rows?.length) continue;
    const row = rows.find(
      r =>
        typeof r === "object" &&
        r !== null &&
        String((r as { id?: unknown }).id ?? "") === String(item.channelId)
    );
    if (!row) continue;
    if (
      typeof row === "object" &&
      row !== null &&
      (row as { restricted?: unknown }).restricted === true
    ) {
      continue;
    }
    playlist.push(row);
  }

  if (playlist.length === 0) return null;

  return {
    playlist,
    canonicalEventId: String(playable[0].eventId),
  };
}

export async function patchCommunityProgramLandingBannerAction(
  communityId: string,
  enforcementId: string,
  landingBannerUrl: string
): Promise<ActionResult<{ ok?: boolean }>> {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return runServerFetch(
    `${base.replace(/\/$/, "")}/communities/${encodeURIComponent(communityId)}/tv/program/${encodeURIComponent(enforcementId)}/landing-banner`,
    {
      method: "PATCH",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({ landingBannerUrl }),
      cache: "no-store",
    },
    "patchCommunityProgramLandingBannerAction"
  );
}

export async function setProgramReminderAction(
  postId: string,
  body: Record<string, unknown>
) {
  const base = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(
    /\/$/,
    ""
  );
  return runServerFetch(
    `${base}/reminder-bucket/posts/${encodeURIComponent(postId)}/set-reminder`,
    {
      method: "POST",
      headers: await serverAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "setProgramReminderAction"
  );
}

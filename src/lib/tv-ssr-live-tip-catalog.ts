import { getCommunityAccessStateAction } from "@/actions/communities";
import { getEventCharacterCatalogAction } from "@/actions/events";
import { fetchTvScheduleAction } from "@/actions/tv-schedule";
import { isCommunityTvEntitledFromAccessState } from "@/lib/community-tv-entitlement";
import { parseEventCharacterCatalog } from "@/lib/parse-event-character-catalog";
import { resolveTvScheduleEventId } from "@/lib/resolve-tv-schedule-event-id";
import type { RoomCharacter } from "@/types";

export type TvInitialTipCatalog = {
  eventId: string;
  characterSets: {
    id: string;
    name: string;
    characters: RoomCharacter[];
  }[];
  characters: RoomCharacter[];
};

export type TvSsrScheduleBootstrap = {
  body: unknown;
  etag: string | null;
};

/**
 * SSR Community TV viewer entitlement for the URL community (from access-state).
 * `unknown` — global /tv or no SSR probe for this navigation.
 */
export type SsrCommunityTvViewerEntitlement = "entitled" | "denied" | "unknown";

/** Source-tagged SSR payload for /tv or /tv?community=:id. */
export type TvSsrBootstrap = {
  communityId: string | null;
  initialTvTipCatalog: TvInitialTipCatalog | null;
  ssrScheduleBootstrap: TvSsrScheduleBootstrap | null;
  ssrCommunityTvViewerEntitlement: SsrCommunityTvViewerEntitlement;
};

/** URL `community` query only — never localStorage. */
export function normalizeTvCommunitySearchParam(
  community: string | null | undefined
): string | null {
  const trimmed = community?.trim();
  return trimmed ? trimmed : null;
}

export function sameTvSsrSource(
  bootstrapCommunityId: string | null | undefined,
  scheduleSourceCommunityId: string | null | undefined
): boolean {
  return (bootstrapCommunityId ?? null) === (scheduleSourceCommunityId ?? null);
}

/** Pending SSR catalog is valid only before items arrive and only for the same TV source. */
export function shouldAllowSsrTvTipPendingInitial(opts: {
  scheduleItemsEmpty: boolean;
  bootstrapCommunityId: string | null | undefined;
  scheduleSourceCommunityId: string | null | undefined;
}): boolean {
  return (
    opts.scheduleItemsEmpty &&
    sameTvSsrSource(opts.bootstrapCommunityId, opts.scheduleSourceCommunityId)
  );
}

/** Persist SSR schedule only when the body belongs to the client's current source. */
export function shouldPersistSsrTvScheduleBootstrap(opts: {
  hasBody: boolean;
  bootstrapCommunityId: string | null | undefined;
  scheduleSourceCommunityId: string | null | undefined;
}): boolean {
  return (
    opts.hasBody &&
    sameTvSsrSource(opts.bootstrapCommunityId, opts.scheduleSourceCommunityId)
  );
}

type ScheduleBody = {
  items?: unknown[];
  livePosition?: { scheduleIndex?: number };
};

/** Live row index from a TV schedule payload (Tipmanna global). */
export function resolveLiveTvScheduleIndex(body: unknown): number {
  const live = (body as ScheduleBody)?.livePosition?.scheduleIndex;
  if (typeof live === "number" && Number.isFinite(live) && live >= 0) {
    return live;
  }
  return 0;
}

/** Event id for the live schedule row, or empty when unknown. */
export function resolveLiveTvEventIdFromSchedule(body: unknown): string {
  const items = (body as ScheduleBody)?.items;
  if (!Array.isArray(items) || items.length === 0) return "";
  const index = Math.min(resolveLiveTvScheduleIndex(body), items.length - 1);
  return resolveTvScheduleEventId(
    items[index] as Parameters<typeof resolveTvScheduleEventId>[0]
  );
}

function catalogFromCharacterSets(
  eventId: string,
  rawSets: unknown
): TvInitialTipCatalog {
  const parsed = parseEventCharacterCatalog(rawSets);
  return {
    eventId,
    characterSets: parsed.characterSets,
    characters: parsed.tippingCharacters,
  };
}

/** Fetch character catalog for the live row of a schedule body. */
export async function fetchLiveRowTipCatalogForSchedule(
  body: unknown
): Promise<TvInitialTipCatalog | null> {
  const eventId = resolveLiveTvEventIdFromSchedule(body);
  if (!eventId) return null;

  const res = await getEventCharacterCatalogAction(eventId);
  if (!res.success || !res.data) return null;

  const rawSets =
    (res.data as { characterSets?: unknown }).characterSets ??
    (res.data as { data?: { characterSets?: unknown } }).data?.characterSets;

  return catalogFromCharacterSets(eventId, rawSets);
}

/** Empty bootstrap for community URL without protected schedule/catalog SSR. */
export function emptyTvSsrBootstrap(
  communityId: string | null,
  ssrCommunityTvViewerEntitlement: SsrCommunityTvViewerEntitlement = communityId
    ? "denied"
    : "unknown"
): TvSsrBootstrap {
  return {
    communityId,
    initialTvTipCatalog: null,
    ssrScheduleBootstrap: null,
    ssrCommunityTvViewerEntitlement,
  };
}

/**
 * SSR entitlement probe — same join surfaces as access-state (member or owner-host).
 * Does not fetch Community TV schedule.
 */
export async function isEntitledToCommunityTvSsrBootstrap(
  communityId: string
): Promise<boolean> {
  const res = await getCommunityAccessStateAction(communityId.trim());
  if (!res.success || !res.data) return false;
  return isCommunityTvEntitledFromAccessState(
    res.data as Parameters<typeof isCommunityTvEntitledFromAccessState>[0]
  );
}

/** SSR: schedule + live-row catalog for the URL source (`community` or global). */
export async function loadSsrTvBootstrap(
  communityId?: string | null
): Promise<TvSsrBootstrap> {
  const cid = normalizeTvCommunitySearchParam(communityId);
  if (cid) {
    const entitled = await isEntitledToCommunityTvSsrBootstrap(cid);
    if (!entitled) {
      return emptyTvSsrBootstrap(cid, "denied");
    }
  }
  const scheduleRes = await fetchTvScheduleAction(
    cid ? { communityId: cid } : undefined
  );
  if (!scheduleRes.success || !scheduleRes.data?.body) {
    return emptyTvSsrBootstrap(cid, cid ? "entitled" : "unknown");
  }

  const ssrScheduleBootstrap: TvSsrScheduleBootstrap = {
    body: scheduleRes.data.body,
    etag: scheduleRes.data.etag ?? null,
  };

  const initialTvTipCatalog = await fetchLiveRowTipCatalogForSchedule(
    scheduleRes.data.body
  );

  return {
    communityId: cid,
    initialTvTipCatalog,
    ssrScheduleBootstrap,
    ssrCommunityTvViewerEntitlement: cid ? "entitled" : "unknown",
  };
}

/** SSR: global Tipmanna schedule + live-row event catalog for /tv first paint. */
export async function loadSsrTipmannaTvBootstrap(): Promise<TvSsrBootstrap> {
  return loadSsrTvBootstrap(null);
}

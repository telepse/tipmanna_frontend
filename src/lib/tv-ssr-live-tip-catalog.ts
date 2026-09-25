import { getEventCharacterCatalogAction } from "@/actions/events";
import { fetchTvScheduleAction } from "@/actions/tv-schedule";
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

/** SSR: global Tipmanna schedule + live-row event catalog for /tv first paint. */
export async function loadSsrTipmannaTvBootstrap(): Promise<{
  initialTvTipCatalog: TvInitialTipCatalog | null;
  ssrScheduleBootstrap: TvSsrScheduleBootstrap | null;
}> {
  const scheduleRes = await fetchTvScheduleAction();
  if (!scheduleRes.success || !scheduleRes.data?.body) {
    return { initialTvTipCatalog: null, ssrScheduleBootstrap: null };
  }

  const ssrScheduleBootstrap: TvSsrScheduleBootstrap = {
    body: scheduleRes.data.body,
    etag: scheduleRes.data.etag ?? null,
  };

  const initialTvTipCatalog = await fetchLiveRowTipCatalogForSchedule(
    scheduleRes.data.body
  );

  return { initialTvTipCatalog, ssrScheduleBootstrap };
}

import { unwrapContentChannelRows } from "@/lib/content-channel-rows";
import { parseEventCharacterCatalog } from "@/lib/parse-event-character-catalog";

export type OverlayContentSeed = {
  eventId: string;
  channelId: string;
  url?: string;
  title?: string;
};

export type OverlayPlaybackPayload = {
  contents: unknown[];
  characters: unknown[];
  characterSets: unknown[];
  isCommunity: boolean;
  communityId: string;
  communityName: string;
};

/** Minimal playlist row so ContentClient can mount before catalog fetch completes. */
export function buildOverlaySeedContentRow(
  seed: OverlayContentSeed
): Record<string, unknown> | null {
  const channelId = seed.channelId?.trim() ?? "";
  const eventId = seed.eventId?.trim() ?? "";
  const url = seed.url?.trim() ?? "";
  if (!channelId || !eventId || !url) return null;
  return {
    id: channelId,
    url,
    title: seed.title?.trim() || "Video",
    restricted: false,
    liveStatus: "NOT_LIVE",
    event: { id: eventId },
  };
}

export function overlayPayloadFromSeed(
  seed: OverlayContentSeed,
  extras?: {
    isCommunity?: boolean;
    communityId?: string;
    communityName?: string;
  }
): OverlayPlaybackPayload | null {
  const row = buildOverlaySeedContentRow(seed);
  if (!row) return null;
  return {
    contents: [row],
    characters: [],
    characterSets: [],
    isCommunity: Boolean(extras?.isCommunity),
    communityId: extras?.communityId ?? "",
    communityName: extras?.communityName ?? "",
  };
}

export function overlayCommunityMetaFromChannelData(
  rawPayload: unknown
): Pick<
  OverlayPlaybackPayload,
  "isCommunity" | "communityId" | "communityName"
> {
  const data = rawPayload as {
    isCommunity?: boolean;
    communityId?: string;
    communityName?: string;
  } | null;
  return {
    isCommunity: Boolean(data?.isCommunity),
    communityId: typeof data?.communityId === "string" ? data.communityId : "",
    communityName:
      typeof data?.communityName === "string" ? data.communityName : "",
  };
}

export function playableContentsFromChannelRows(rows: unknown[]): unknown[] {
  const list = Array.isArray(rows) ? rows : [];
  const playable = list.filter(
    (c: unknown) => !(c as { restricted?: boolean })?.restricted
  );
  return playable.length ? playable : list;
}

export function buildOverlayPayloadFromChannelData(
  rawPayload: unknown
): OverlayPlaybackPayload | null {
  const rows = unwrapContentChannelRows(rawPayload);
  const contents = playableContentsFromChannelRows(rows);
  if (!contents.length) return null;
  return {
    contents,
    characters: [],
    characterSets: [],
    ...overlayCommunityMetaFromChannelData(rawPayload),
  };
}

export function resolveOverlayTipCatalog(input: {
  tippingCharacters: unknown;
  globalCharacterSets: unknown;
  eventCharacterSets: unknown;
}): { characters: unknown[]; characterSets: unknown[] } {
  const eventCatalog = parseEventCharacterCatalog(
    input.eventCharacterSets as Parameters<typeof parseEventCharacterCatalog>[0]
  );
  const characterSets =
    eventCatalog.characterSets.length > 0
      ? eventCatalog.characterSets
      : Array.isArray(input.globalCharacterSets)
        ? input.globalCharacterSets
        : [];
  const characters =
    eventCatalog.tippingCharacters.length > 0
      ? eventCatalog.tippingCharacters
      : Array.isArray(input.tippingCharacters)
        ? input.tippingCharacters
        : [];
  return { characters, characterSets };
}

/** Only show load error when playback never mounted (Phase A failed). */
export function shouldSurfaceOverlayLoadError(input: {
  cancelled: boolean;
  playbackMounted: boolean;
}): boolean {
  return !input.cancelled && !input.playbackMounted;
}

/** Phase B: hydrate tips without remounting the player (keep contents). */
export function mergeOverlayCatalogOntoPayload(
  prev: OverlayPlaybackPayload,
  catalog: { characters: unknown[]; characterSets: unknown[] },
  communityPatch?: Partial<
    Pick<
      OverlayPlaybackPayload,
      "isCommunity" | "communityId" | "communityName"
    >
  >
): OverlayPlaybackPayload {
  return {
    ...prev,
    ...communityPatch,
    contents: prev.contents,
    characters: catalog.characters,
    characterSets: catalog.characterSets,
  };
}

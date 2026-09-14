import { pickInitialChannelContent } from "@/lib/public-video-url";

type ChannelSeoRow = {
  id?: string;
  restricted?: boolean;
  externalSearchBanned?: boolean;
};

/** True when the page's primary channel should be excluded from search indexing. */
export function isPrimaryChannelExternalSearchBanned(
  list: ChannelSeoRow[],
  initialChannelId: string | null
): boolean {
  const playable = list.filter(c => !c.restricted);
  const pool = playable.length ? playable : list;
  const target = pickInitialChannelContent(pool, initialChannelId);
  return Boolean(target?.externalSearchBanned);
}

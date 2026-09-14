import type { HostCreatorEvent } from "@/actions/host-creator";
import type { TipLinkSummary } from "@/actions/tiplink";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { isTipLinkEligibleChannel } from "@/lib/tiplink-channel-eligibility";

export type TipLinkPickerVideo = {
  channelId: string;
  eventId: string;
  eventSlug: string | null;
  title: string;
  url: string;
  thumb: string | null;
};

export function listTipLinkEligibleVideos(
  events: HostCreatorEvent[],
  tipLinks: TipLinkSummary[],
  draftTipLinks: TipLinkSummary[] = []
): TipLinkPickerVideo[] {
  const usedChannels = new Set([
    ...tipLinks.map(t => t.eventChannelId),
    ...draftTipLinks.map(t => t.eventChannelId),
  ]);

  const out: TipLinkPickerVideo[] = [];
  for (const event of events) {
    for (const video of event.videos) {
      if (usedChannels.has(video.id)) continue;
      if (
        !isTipLinkEligibleChannel({
          communityBankEntry: (video as { communityBankEntry?: unknown })
            .communityBankEntry as Parameters<
            typeof isTipLinkEligibleChannel
          >[0]["communityBankEntry"],
        })
      ) {
        continue;
      }
      const vid = extractYoutubeID(video.url);
      out.push({
        channelId: video.id,
        eventId: event.id,
        eventSlug: event.eventSlug,
        title: video.title,
        url: video.url,
        thumb: vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null,
      });
    }
  }
  return out;
}

export function tipLinkListThumb(
  bannerUrl: string | null | undefined,
  videoUrl: string
): string | null {
  const custom = bannerUrl?.trim();
  if (custom) return custom;
  const vid = extractYoutubeID(videoUrl);
  return vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null;
}

export function tipLinkThumbClassName(
  aspect: "landscape" | "square" | null | undefined
): string {
  return aspect === "square"
    ? "aspect-square rounded object-cover"
    : "aspect-video rounded object-cover";
}

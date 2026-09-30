import type {
  HostCreatorEvent,
  HostCreatorVideo,
} from "@/actions/host-creator";
import type { TipLinkSummary } from "@/actions/tiplink";
import type { CommunityContentBankVideo } from "@/actions/communities";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import {
  isTipLinkEligibleCommunityBankChannel,
  isTipLinkEligibleEventRoomChannel,
} from "@/lib/tiplink-channel-eligibility";

export type TipLinkPickerVideo = {
  channelId: string;
  eventId: string;
  eventSlug: string | null;
  title: string;
  url: string;
  thumb: string | null;
  source?: "event_room" | "community_bank";
  communityId?: string;
  communityName?: string;
};

export type TipLinkPickerEvent = {
  id: string;
  eventName: string;
  eventSlug: string | null;
  videos: TipLinkPickerVideo[];
};

/** Shape of GET /video-requests/me/videos-by-event events[]. */
export type VideosByEventRow = {
  id: string;
  eventName: string;
  channels?: Array<{
    id: string;
    title: string;
    url: string;
    description?: string | null;
  }>;
};

const stubHostCreatorEventFields = {
  eventBanner: null,
  submissionKind: null as HostCreatorEvent["submissionKind"],
  numOfTips: 0,
  amountRaised: 0,
  createdAt: "",
  locked: false,
  startTime: "",
  endTime: "",
  eventDate: "",
  organizationName: null,
};

export function mapVideosByEventToHostCreatorEvents(
  rows: VideosByEventRow[],
  hostEventSlug: string | null
): HostCreatorEvent[] {
  return rows.map(ev => {
    const eventSlug = hostEventSlug;
    const videos: HostCreatorVideo[] = (ev.channels ?? []).map(ch => ({
      id: ch.id,
      title: ch.title,
      url: ch.url,
      numOfTips: 0,
      numOfSaves: 0,
      numOfSeen: 0,
      numOfComments: 0,
      locked: false,
      event: {
        id: ev.id,
        eventName: ev.eventName,
        eventSlug,
      },
    }));
    return {
      id: ev.id,
      eventName: ev.eventName,
      eventSlug,
      videos,
      ...stubHostCreatorEventFields,
    };
  });
}

export function listTipLinkEligibleEventRoomVideos(
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
        !isTipLinkEligibleEventRoomChannel({
          communityBankEntry: (video as { communityBankEntry?: unknown })
            .communityBankEntry as Parameters<
            typeof isTipLinkEligibleEventRoomChannel
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
        source: "event_room",
      });
    }
  }
  return out;
}

export function listTipLinkEligibleEvents(
  events: HostCreatorEvent[],
  tipLinks: TipLinkSummary[],
  draftTipLinks: TipLinkSummary[] = []
): TipLinkPickerEvent[] {
  const usedChannels = new Set([
    ...tipLinks.map(t => t.eventChannelId),
    ...draftTipLinks.map(t => t.eventChannelId),
  ]);

  return events
    .map(event => {
      const videos: TipLinkPickerVideo[] = [];
      for (const video of event.videos) {
        if (usedChannels.has(video.id)) continue;
        if (
          !isTipLinkEligibleEventRoomChannel({
            communityBankEntry: (video as { communityBankEntry?: unknown })
              .communityBankEntry as Parameters<
              typeof isTipLinkEligibleEventRoomChannel
            >[0]["communityBankEntry"],
          })
        ) {
          continue;
        }
        const vid = extractYoutubeID(video.url);
        videos.push({
          channelId: video.id,
          eventId: event.id,
          eventSlug: event.eventSlug,
          title: video.title,
          url: video.url,
          thumb: vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null,
          source: "event_room",
        });
      }
      return {
        id: event.id,
        eventName: event.eventName,
        eventSlug: event.eventSlug,
        videos,
      };
    })
    .filter(event => event.videos.length > 0);
}

export function listTipLinkEligibleCommunityBankVideos(
  communityId: string,
  communityName: string,
  approvedVideos: CommunityContentBankVideo[],
  tipLinks: TipLinkSummary[],
  draftTipLinks: TipLinkSummary[] = [],
  eventId?: string | null
): TipLinkPickerVideo[] {
  const linkedEventId = eventId?.trim() ?? "";
  if (!linkedEventId) return [];

  const usedChannels = new Set([
    ...tipLinks.map(t => t.eventChannelId),
    ...draftTipLinks.map(t => t.eventChannelId),
  ]);

  return approvedVideos
    .filter(entry => {
      if (usedChannels.has(entry.channel.id)) return false;
      return isTipLinkEligibleCommunityBankChannel({
        communityBankEntry: {
          status: entry.status,
          visibility: entry.visibility,
        },
      });
    })
    .map(entry => {
      const vid = extractYoutubeID(entry.channel.url);
      return {
        channelId: entry.channel.id,
        eventId: linkedEventId,
        eventSlug: null,
        title: entry.channel.title,
        url: entry.channel.url,
        thumb: vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null,
        source: "community_bank" as const,
        communityId,
        communityName,
      };
    });
}

/** @deprecated Use listTipLinkEligibleEventRoomVideos */
export function listTipLinkEligibleVideos(
  events: HostCreatorEvent[],
  tipLinks: TipLinkSummary[],
  draftTipLinks: TipLinkSummary[] = []
): TipLinkPickerVideo[] {
  return listTipLinkEligibleEventRoomVideos(events, tipLinks, draftTipLinks);
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

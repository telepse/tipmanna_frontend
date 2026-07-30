"use server";

import { EventFormData, NewCreateEventPayload } from "@/schemas";
import { runServerFetch, actionFail, actionOk } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";
import { unwrapPaginatedList } from "@/lib/unwrap-paginated-list";

// -------- Create event -------- //
export async function createEventAction(
  formData: EventFormData,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(formData),
      cache: "no-store",
    },
    "createEventAction"
  );
}

// -------- New create event -------- //
export async function newCreateEventAction(
  formData: NewCreateEventPayload,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/new`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(formData),
      cache: "no-store",
    },
    "newCreateEventAction"
  );
}

// -------- Get host events (lightweight summary for create dialog) -------- //
export async function getHostEventsSummaryAction(token?: string | null) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/me/summary`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getHostEventsSummaryAction"
  );
}

// -------- Get host events -------- //
export async function getHostEventsAction(
  token?: string | null,
  options?: { limit?: number; page?: number }
) {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  const query = params.toString();

  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/me${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getHostEventsAction"
  );
}

// -------- Create event channel -------- //
export async function createEventChannelAction(
  values: {
    title: string;
    url: string;
    isLive: boolean;
    reminders?: number[];
    contentLanguage?: string;
    contentCountry?: string;
    eventVideoType?: string;
    ownershipAnswer?: "yes" | "no";
    coOwnerDraftKey?: string | null;
    onYoutubeChannelSlot?: number | null;
    isOnHostYoutube?: boolean;
  },
  eventId: string,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/channel`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "createEventChannelAction"
  );
}

const COOWNER_API = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export async function getYoutubeChannelsAction(token?: string | null) {
  return runServerFetch(
    `${COOWNER_API}/me/youtube-channels`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getYoutubeChannelsAction"
  );
}

export async function upsertYoutubeChannelAction(
  body: { slot: number; url: string; rawUrl?: string },
  token?: string | null
) {
  return runServerFetch(
    `${COOWNER_API}/me/youtube-channels`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "upsertYoutubeChannelAction"
  );
}

export async function getVideoCoOwnerInviteStatusAction(
  draftKey: string,
  token?: string | null
) {
  const q = new URLSearchParams({ draftKey });
  return runServerFetch(
    `${COOWNER_API}/host/video-co-owner-invites/status?${q}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getVideoCoOwnerInviteStatusAction"
  );
}

export async function createVideoCoOwnerInviteAction(
  body: {
    draftKey: string;
    coOwnerName: string;
    coOwnerEmail: string;
    payoutPercentBp: number;
    contentTitle?: string;
    youtubeLink?: string;
  },
  token?: string | null
) {
  return runServerFetch(
    `${COOWNER_API}/host/video-co-owner-invites`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "createVideoCoOwnerInviteAction"
  );
}

export async function getHostCoOwnedVideosDashboardAction(
  token?: string | null
) {
  return runServerFetch(
    `${COOWNER_API}/host/me/co-owned-videos`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getHostCoOwnedVideosDashboardAction"
  );
}

// -------- Get host events -------- //
export async function getHostEventsTabsAction(token?: string | null) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/tabs`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getHostEventsTabsAction"
  );
}

export type HostDefaultChannelItem = {
  id: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  approved: boolean;
  amountRaised: number;
  numOfTips: number;
  showAmountRaisedOnVideos?: boolean;
  showViewCountOnVideos?: boolean;
  showEncounterOnVideos?: boolean;
  defaultChannel: {
    id: string;
    title: string;
    url: string;
    numOfTips: number;
    isDefault: boolean;
  };
};

export async function getHostDefaultChannelsAction(token?: string | null) {
  return runServerFetch<{ items: HostDefaultChannelItem[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/default-channels`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getHostDefaultChannelsAction"
  );
}

// -------- Get host events for tabs by status -------- //
export async function getHostEventsForTabsByStatus(token?: string | null) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/tabs-status`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getHostEventsForTabsByStatus"
  );
}

// -------- Get host fees -------- //
export async function getHostFeesAction(token?: string | null) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/fees`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getHostFeesAction"
  );
}

// -------- Search events by code -------- //
export async function searchEventsByCodeAction(eventCode: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/code/${eventCode}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "searchEventsByCodeAction"
  );
}

// -------- Search events by keyword (eventCode, eventName, organizationName) -------- //
export async function searchEventsAction(keyword: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/search?keyword=${encodeURIComponent(
      keyword
    )}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "searchEventsAction"
  );
}

/** Normalized GET /events/:id JSON (arrays guaranteed for nested lists). */
export type EventByIdData = {
  id: string;
  eventName: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  amountToRaise?: number;
  amountRaised?: number;
  numOfTips?: number;
  liveVideoLink?: string;
  defaultAdminVideo?: string;
  hostName?: string;
  organizationName?: string | null;
  eventCode?: string;
  eventSlug?: string;
  eventBackground?: string | null;
  eventBanner?: string;
  venueLocation?: string;
  hideProgressBarAmount?: boolean;
  showLatestAmount?: boolean;
  totalAttendees?: number;
  latestTipAmount?: number;
  characterSets: unknown[];
  tipUsageDisclosure: unknown[];
  approved?: boolean;
  performers?: unknown[];
  projects?: unknown[];
  contributionType?: string;
  EventSession?: unknown[];
  eventType?: string;
  host?: {
    id?: string;
    fullName?: string;
    username?: string;
  };
};

export type EventCharacterCatalogData = {
  eventId: string;
  characterSets: unknown[];
};

// -------- Get event character catalog (lightweight) -------- //
export async function getEventCharacterCatalogAction(eventId: string) {
  if (!eventId || typeof eventId !== "string" || !eventId.trim()) {
    return actionFail<EventCharacterCatalogData>(
      "Event ID is required",
      "getEventCharacterCatalogAction"
    );
  }
  return runServerFetch<EventCharacterCatalogData>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId.trim()}/character-catalog`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getEventCharacterCatalogAction",
    raw => {
      const data = raw as Record<string, unknown>;
      return {
        eventId:
          typeof data.eventId === "string" ? data.eventId : eventId.trim(),
        characterSets: Array.isArray(data.characterSets)
          ? data.characterSets
          : [],
      } as EventCharacterCatalogData;
    }
  );
}

// -------- Get event by ID -------- //
export async function getEventByIdAction(eventId: string) {
  if (!eventId || typeof eventId !== "string" || !eventId.trim()) {
    return actionFail<EventByIdData>(
      "Event ID is required",
      "getEventByIdAction"
    );
  }
  return runServerFetch<EventByIdData>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId.trim()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getEventByIdAction",
    raw => {
      const data = raw as Record<string, unknown>;
      const base =
        typeof raw === "object" && raw !== null
          ? raw
          : ({} as Record<string, unknown>);
      return {
        ...base,
        characterSets: Array.isArray(data.characterSets)
          ? data.characterSets
          : [],
        tipUsageDisclosure: Array.isArray(data.tipUsageDisclosure)
          ? data.tipUsageDisclosure
          : [],
      } as EventByIdData;
    }
  );
}

// -------- Get event channels -------- //
export async function getEventChannels(eventId: string) {
  if (!eventId?.trim()) {
    return actionFail("Event ID is required", "getEventChannels");
  }
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/channels`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getEventChannels"
  );
}

// -------- Get event channels -------- //
export async function updateDefaultChannel(eventId: string, channelId: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/channels/${channelId}/default`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventId }),
      cache: "no-store",
    },
    "updateDefaultChannel"
  );
}

// -------- Get all host events -------- //
export async function getAllHostEvents() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getAllHostEvents"
  );
}

// -------- Get public host events -------- //
export async function getPublicHostEventsAction(
  hostName: string,
  eventCode: string
) {
  if (!hostName || !eventCode) {
    return actionFail(
      "Host name and event code are required",
      "getPublicHostEventsAction"
    );
  }

  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/${hostName}?eventCode=${eventCode}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getPublicHostEventsAction"
  );
}

// -------- Get nearby events -------- //
export async function getNearbyEventsAction(country: string) {
  if (!country) {
    const f = actionFail<unknown[]>(
      "Location not detected",
      "getNearbyEventsAction"
    );
    return { ...f, events: [] as unknown[] };
  }

  const url = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/nearby?location=${encodeURIComponent(
    country
  )}`;

  const result = await runServerFetch(
    url,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getNearbyEventsAction"
  );

  if (!result.success) {
    return { ...result, events: [] as unknown[] };
  }

  return result;
}

export async function getTotalTippedForEvent(
  eventId: string,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/total/${eventId}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getTotalTippedForEvent"
  );
}

export async function getTotalTippedByAllUsersForEvent(eventId: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/event/${eventId}/total-tipped/all`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getTotalTippedByAllUsersForEvent"
  );
}

export async function getTippedEventsForTipper(token?: string | null) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/tipped`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getTippedEventsForTipper"
  );
}

export async function getMyTippedVideos(token?: string | null) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/me/tipped-videos`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getMyTippedVideos"
  );
}

export async function getTippedEventsForVisitor(token?: string | null) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/tivved`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getTippedEventsForVisitor"
  );
}

// -------- Get total amount tipped amount by tipper -------- //
export async function getTotalAmountTippedByTipper(token?: string | null) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/total-amount-tipped`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getTotalAmountTippedByTipper"
  );
}

// -------- Get total amount tipped amount by tipper -------- //
export async function getAmountTippedByTipper(
  eventId: string,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/amount-tipped/${eventId}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getAmountTippedByTipper"
  );
}

// -------- Get total amount tipped amount by visitor -------- //
export async function getAmountTippedByVisitor(
  eventId: string,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/amount-tivved/${eventId}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getAmountTippedByVisitor"
  );
}

// -------- Get total amount tipped amount by visitor -------- //
export async function getTotalAmountTippedByVisitor(token?: string | null) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/total-amount-tivved`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getTotalAmountTippedByVisitor"
  );
}

// -------- Get amount tipped amount by user -------- //
export async function getAmountTippedByUser(
  eventId: string,
  token: string | null | undefined
) {
  if (!eventId?.trim()) {
    return actionFail("Event ID is required", "getAmountTippedByUser");
  }
  if (!token?.trim()) {
    return actionOk(0);
  }
  return runServerFetch<number>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/amount-tipped-by-user/${eventId.trim()}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getAmountTippedByUser",
    raw => (typeof raw === "number" ? raw : 0)
  );
}

// -------- Change event screen settings -------- //
export async function changeEventScreenSettings(
  values: {
    eventBackground: string;
    moneyFor: string;
    showLatestAmount: boolean;
    hideProgressBarAmount: boolean;
    tipUsageDisclosure?: Array<{
      id?: string;
      usageType: "PERFORMER_WELFARE" | "HOST_WELFARE" | "COHOST_WELFARE";
      percentage: number;
      customLabel?: string | null;
    }>;
    performers: { id?: string; name: string; description?: string }[];
    projects: { id?: string; name: string; description?: string }[];
  },
  eventId: string,
  token?: string | null
) {
  const formattedData = {
    background: values.eventBackground,
    moneyFor: values.moneyFor,
    showLatest: values.showLatestAmount,
    hideProgressAmount: values.hideProgressBarAmount,
    tipUsageDisclosure: values.tipUsageDisclosure,
    performers: values.performers,
    projects: values.projects,
  };

  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/screen-settings`,
    {
      method: "PATCH",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(formattedData),
      cache: "no-store",
    },
    "changeEventScreenSettings"
  );
}

// -------- Change event video display settings (premium hosts) -------- //
export async function changeEventVideoDisplaySettingsAction(
  values: {
    showAmountRaisedOnVideos: boolean;
    showViewCountOnVideos: boolean;
    showEncounterOnVideos: boolean;
  },
  eventId: string,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/video-display-settings`,
    {
      method: "PATCH",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "changeEventVideoDisplaySettingsAction"
  );
}

// -------- Event attend -------- //
export async function eventAttendAction(eventId: string) {
  let ip = "0.0.0.0";
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
    });
    const text = await ipRes.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as { ip?: string };
        if (typeof parsed.ip === "string") ip = parsed.ip;
      } catch {
        /* ignore ip parse */
      }
    }
  } catch {
    console.error("[ServerAction:eventAttendAction]", "ipify fetch failed");
  }

  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/attend`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventId, ip }),
      cache: "no-store",
    },
    "eventAttendAction"
  );
}

export async function getAllEventChannels() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/all-channels?limit=100`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getAllEventChannels",
    unwrapPaginatedList
  );
}

/** Targeted lookup for /tv?videoId= deep-link metadata and fullscreen. */
export async function getEventChannelByYoutubeVideoId(videoId: string) {
  const id = videoId.trim();
  if (!id) {
    return { success: false as const, message: "videoId required", data: null };
  }
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/channels/by-youtube/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "force-cache",
      next: { revalidate: 300 },
    },
    "getEventChannelByYoutubeVideoId"
  );
}

export async function getAllTopTippers() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/top-tippers`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getAllTopTippers"
  );
}

export async function getSavedVideosForTipper(token?: string | null) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/tipper/saved-videos`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getSavedVideosForTipper"
  );
}

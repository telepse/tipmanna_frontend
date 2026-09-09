"use server";

import { EventFormData, NewCreateEventPayload } from "@/schemas";
import { runServerFetch, actionFail, actionOk } from "@/lib/action-fetch";
import { serverAuthHeaders, serverHostAuthHeaders } from "@/lib/server-auth";
import { serverEventActorAuthHeaders } from "@/lib/server-event-auth";
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
export async function newCreateEventAction(formData: NewCreateEventPayload) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/new`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(formData),
      cache: "no-store",
    },
    "newCreateEventAction",
    undefined,
    { maxAttempts: 1 }
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
export async function getHostEventsAction(options?: {
  limit?: number;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  const query = params.toString();

  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/me${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostEventsAction"
  );
}

// -------- Create event channel -------- //
export async function createEventChannelAction(
  values: {
    title: string;
    description?: string;
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
  token?: string | null,
  options?: { fromCreateDialog?: boolean; useHostSession?: boolean }
) {
  const headers = options?.fromCreateDialog
    ? await serverAuthHeaders(token)
    : options?.useHostSession
      ? await serverHostAuthHeaders(token)
      : await serverEventActorAuthHeaders();
  if (options?.fromCreateDialog) {
    headers["X-Create-Surface"] = "create_dialog";
  }
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/channel`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "createEventChannelAction",
    undefined,
    { maxAttempts: 1 }
  );
}

const COOWNER_API = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export async function getYoutubeChannelsAction() {
  return runServerFetch(
    `${COOWNER_API}/me/youtube-channels`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getYoutubeChannelsAction"
  );
}

export async function upsertYoutubeChannelAction(body: {
  slot: number;
  url: string;
  rawUrl?: string;
}) {
  return runServerFetch(
    `${COOWNER_API}/me/youtube-channels`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "upsertYoutubeChannelAction"
  );
}

export async function getVideoCoOwnerInviteStatusAction(draftKey: string) {
  const q = new URLSearchParams({ draftKey });
  return runServerFetch(
    `${COOWNER_API}/host/video-co-owner-invites/status?${q}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "getVideoCoOwnerInviteStatusAction"
  );
}

export async function createVideoCoOwnerInviteAction(body: {
  draftKey: string;
  coOwnerName: string;
  coOwnerEmail: string;
  payoutPercentBp: number;
  contentTitle?: string;
  youtubeLink?: string;
}) {
  return runServerFetch(
    `${COOWNER_API}/host/video-co-owner-invites`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "createVideoCoOwnerInviteAction"
  );
}

export async function resendVideoCoOwnerInviteAction(
  inviteId: string,
  body?: { contentTitle?: string; youtubeLink?: string }
) {
  return runServerFetch(
    `${COOWNER_API}/host/video-co-owner-invites/${encodeURIComponent(inviteId)}/resend`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
    },
    "resendVideoCoOwnerInviteAction"
  );
}

export async function revokeVideoCoOwnerInviteAction(inviteId: string) {
  return runServerFetch(
    `${COOWNER_API}/host/video-co-owner-invites/${encodeURIComponent(inviteId)}/revoke`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "revokeVideoCoOwnerInviteAction"
  );
}

export async function getHostCoOwnedVideosDashboardAction() {
  return runServerFetch(
    `${COOWNER_API}/host/me/co-owned-videos`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostCoOwnedVideosDashboardAction"
  );
}

// -------- Get host events -------- //
export async function getHostEventsTabsAction() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/tabs`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
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

export async function getHostDefaultChannelsAction() {
  return runServerFetch<{ items: HostDefaultChannelItem[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/default-channels`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostDefaultChannelsAction"
  );
}

// -------- Get host events for tabs by status -------- //
export async function getHostEventsForTabsByStatus() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/tabs-status`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostEventsForTabsByStatus"
  );
}

// -------- Get host fees -------- //
export async function getHostFeesAction() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/host/fees`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
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
  venueName?: string;
  venueLocation?: string;
  activities: unknown[];
  eventDescription?: string;
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
  timeZone?: string;
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
  const trimmed = eventId.trim();
  const { buildEventRoomRequestHeaders } = await import(
    "@/lib/event-room-request"
  );
  return runServerFetch<EventByIdData>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${trimmed}`,
    {
      method: "GET",
      headers: await buildEventRoomRequestHeaders(trimmed),
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
  const trimmed = eventId.trim();
  const { buildEventRoomRequestHeaders } = await import(
    "@/lib/event-room-request"
  );
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${trimmed}/channels`,
    {
      method: "GET",
      headers: await buildEventRoomRequestHeaders(trimmed),
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
        ...(await serverEventActorAuthHeaders()),
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
  eventId: string
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
      headers: await serverEventActorAuthHeaders(),
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
  eventId: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/video-display-settings`,
    {
      method: "PATCH",
      headers: await serverEventActorAuthHeaders(),
      body: JSON.stringify(values),
      cache: "no-store",
    },
    "changeEventVideoDisplaySettingsAction"
  );
}

export async function togglePerformerPinAction(performerId: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/performers/${encodeURIComponent(performerId)}/toggle-pin`,
    {
      method: "PATCH",
      headers: await serverEventActorAuthHeaders(),
      cache: "no-store",
    },
    "togglePerformerPinAction"
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

export async function addEventPerformersAction(
  eventId: string,
  performers: { name: string; amountReceived?: string }[]
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/performers`,
    {
      method: "POST",
      headers: await serverEventActorAuthHeaders(),
      body: JSON.stringify({ performers }),
      cache: "no-store",
    },
    "addEventPerformersAction"
  );
}

export async function addEventProjectsAction(
  eventId: string,
  projects: { name: string; amountReceived?: string }[]
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/projects`,
    {
      method: "POST",
      headers: await serverEventActorAuthHeaders(),
      body: JSON.stringify({ projects }),
      cache: "no-store",
    },
    "addEventProjectsAction"
  );
}

export type EventAccessMode =
  | "public"
  | "invite_only"
  | "host_code"
  | "custom_code"
  | "email_gate"
  | "community_members";

export async function patchEventAccessModeAction(
  eventId: string,
  payload: {
    accessMode: EventAccessMode;
    accessHostCode?: string | null;
    accessCustomCode?: string | null;
    accessEmailAutoApprove?: boolean;
    accessRequiresApproval?: boolean;
  }
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/access-mode`,
    {
      method: "PATCH",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(payload),
      cache: "no-store",
    },
    "patchEventAccessModeAction"
  );
}

export async function getEventRoomInvitesAction(eventId: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/room-invites`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getEventRoomInvitesAction"
  );
}

export async function createEventRoomInviteAction(
  eventId: string,
  email: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/room-invites`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({ email }),
      cache: "no-store",
    },
    "createEventRoomInviteAction"
  );
}

export async function validateEventRoomInviteAction(token: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/room-invites/${encodeURIComponent(token)}/validate`,
    {
      method: "GET",
      cache: "no-store",
    },
    "validateEventRoomInviteAction"
  );
}

export async function acceptEventRoomInviteAction(token: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/room-invites/accept`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    },
    "acceptEventRoomInviteAction"
  );
}

export async function getEventRoomAccessAction(
  eventId: string,
  inviteToken?: string | null,
  opts?: { accessCode?: string | null; email?: string | null }
) {
  const { getToken } = await import("@/lib/getToken");
  const { getEventRoomInviteToken } = await import(
    "@/lib/event-room-invite-cookie.server"
  );
  const token = await getToken();
  const resolvedInvite =
    inviteToken?.trim() || (await getEventRoomInviteToken(eventId));
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (resolvedInvite) headers["x-event-room-invite-token"] = resolvedInvite;
  if (opts?.accessCode?.trim()) {
    headers["x-event-room-access-code"] = opts.accessCode.trim();
  }
  if (opts?.email?.trim()) {
    headers["x-event-room-access-email"] = opts.email.trim();
  }

  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/room-access`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
    "getEventRoomAccessAction"
  );
}

export async function submitEventRoomAccessAction(
  eventId: string,
  body: { accessCode?: string; email?: string; answersJson?: unknown }
) {
  const { getToken } = await import("@/lib/getToken");
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body.accessCode?.trim()) {
    headers["x-event-room-access-code"] = body.accessCode.trim();
  }
  if (body.email?.trim()) {
    headers["x-event-room-access-email"] = body.email.trim();
  }

  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/${eventId}/room-access/submit`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "submitEventRoomAccessAction"
  );
}

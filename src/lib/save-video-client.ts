/**
 * Client-side save flow: maps role → API owner payload and calls the
 * server `saveVideo` action. Used from channel, content, and TV looper.
 *
 * `channelId` must be an **EventChannel** id (`POST .../events/channels/:channelId/save`),
 * not the parent Event (room) id.
 */
import { saveVideo, unsaveChannelVideo } from "@/actions/contents";
import { getSavedVideosForTipper } from "@/actions/events";
import { actionFail, actionOk, type ActionResult } from "@/lib/action-fetch";
import type { ApiError } from "@/types/api-error.types";

export function buildChannelSaveOwner(
  role: string | undefined,
  userId: string | undefined
): { hostId?: string; tipperId?: string } | null {
  if (!userId) return null;
  if (role === "VISITOR") return null;
  if (role === "TIPPER") return { tipperId: userId };
  return null;
}

/** Whether `channelId` appears in a list from GET saved-videos. */
export function isChannelSaved(
  channelId: string,
  savedItems: unknown
): boolean {
  if (!channelId || !Array.isArray(savedItems)) return false;
  return savedItems.some(
    (s: { channelId?: string; channel?: { id?: string } }) => {
      const id = s?.channelId ?? s?.channel?.id;
      return id != null && String(id) === String(channelId);
    }
  );
}

/** Normalise GET saved-videos response (array or `{ data: [] }`). */
export function normalizeSavedVideosList(rawSaved: unknown): unknown[] {
  if (Array.isArray(rawSaved)) return rawSaved;
  if (
    rawSaved &&
    typeof rawSaved === "object" &&
    "data" in rawSaved &&
    Array.isArray((rawSaved as { data: unknown[] }).data)
  ) {
    return (rawSaved as { data: unknown[] }).data;
  }
  return [];
}

export type ToggleSaveResult = { toggledTo: "saved" | "unsaved" };

/**
 * Refetches saved list, then saves or unsaves so the action matches server state
 * (avoids duplicates if the UI was stale). Uses HttpOnly cookie when token omitted.
 */
export async function toggleChannelSaveForUser(params: {
  channelId: string;
  token?: string | null;
  role: string | undefined;
  userId: string | undefined;
}): Promise<ActionResult<ToggleSaveResult>> {
  const { channelId, token, role, userId } = params;
  const owner = buildChannelSaveOwner(role, userId);
  if (!owner) {
    return actionFail<ToggleSaveResult>(
      "Sign in as a tipper to save this video."
    );
  }

  const savedRes = await getSavedVideosForTipper(token);
  if (!savedRes.success) {
    return actionFail<ToggleSaveResult>(
      savedRes.error ?? savedRes.message ?? "Could not load saved videos"
    );
  }

  const list = normalizeSavedVideosList(savedRes.data);
  const currentlySaved = isChannelSaved(channelId, list);

  if (currentlySaved) {
    const unsaveRes = await unsaveChannelVideo(channelId, token);
    if (!unsaveRes.success) {
      return actionFail<ToggleSaveResult>(
        unsaveRes.error ?? unsaveRes.message ?? "Failed to unsave video"
      );
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("tipmanna:saves-changed"));
    }
    return actionOk<ToggleSaveResult>({ toggledTo: "unsaved" });
  }

  const saveRes = await saveVideo(channelId, token, owner);
  if (!saveRes.success) {
    return actionFail<ToggleSaveResult>(
      saveRes.error ?? saveRes.message ?? "Failed to save video"
    );
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("tipmanna:saves-changed"));
  }
  return actionOk<ToggleSaveResult>({ toggledTo: "saved" });
}

export async function saveChannelForCurrentUser(params: {
  channelId: string;
  token?: string | null;
  role: string | undefined;
  userId: string | undefined;
}): Promise<ActionResult<unknown>> {
  const { channelId, token, role, userId } = params;
  const owner = buildChannelSaveOwner(role, userId);
  if (!owner) {
    return actionFail<unknown>("Sign in as a tipper to save this video.");
  }
  return saveVideo(channelId, token, owner);
}

export async function unsaveChannelWithToken(
  channelId: string,
  token?: string | null
): Promise<ActionResult<unknown>> {
  return unsaveChannelVideo(channelId, token);
}

export function formatSaveVideoError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "error" in err) {
    const apiErr = err as ApiError;
    if (apiErr.error?.message) return apiErr.error.message;
  }
  return "Failed to save video";
}

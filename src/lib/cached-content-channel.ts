import { cache } from "react";

import { getContentChannelAction } from "@/actions/contents";
import { getToken } from "@/lib/getToken";
import { getHostToken } from "@/lib/getHostToken";

/** Per-request dedupe for content/channel page + metadata (tipper or host auth). */
export const getCachedContentChannelForPage = cache(async (eventId: string) => {
  const token = (await getToken()) ?? (await getHostToken()) ?? undefined;
  return getContentChannelAction(eventId, token);
});

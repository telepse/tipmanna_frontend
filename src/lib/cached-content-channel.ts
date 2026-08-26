import { cache } from "react";

import { getContentChannelAction } from "@/actions/contents";
import { getToken } from "@/lib/getToken";

/** Per-request dedupe for content/channel page + metadata. */
export const getCachedContentChannelForPage = cache(async (eventId: string) => {
  const token = await getToken();
  return getContentChannelAction(eventId, token ?? undefined);
});

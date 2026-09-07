import type { TipLinkPublicPayload } from "@/actions/tiplink";
import { resolveContentLocaleDisplay } from "@/lib/tv/contentLocaleDisplay";

function pickCountry(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "all") return null;
  return trimmed;
}

/** Resolve TipLink locale flag the same way as explore (channel, then event). */
export function resolveTipLinkLocaleDisplay(
  payload: Pick<TipLinkPublicPayload, "channel" | "event">
) {
  const { channel, event } = payload;
  const contentLanguage =
    channel.contentLanguage?.trim() || event.contentLanguage?.trim() || null;
  const contentCountry =
    pickCountry(channel.contentCountry) ?? pickCountry(event.contentCountry);

  return resolveContentLocaleDisplay(contentLanguage, contentCountry, {
    countryOnly: true,
  });
}

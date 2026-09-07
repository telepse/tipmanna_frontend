import type { ReactNode } from "react";
import Image from "next/image";
import { SiApplemusic, SiAudiomack, SiSpotify, SiTiktok } from "react-icons/si";

export type TipLinkStoreKey =
  | "appleMusicUrl"
  | "spotifyUrl"
  | "audiomackUrl"
  | "tiktokUrl"
  | "custom"
  | "tipmanna";

export const TIPLINK_STORE_FIELDS = [
  { key: "appleMusicUrl" as const, label: "Apple Music", verb: "Play" },
  { key: "spotifyUrl" as const, label: "Spotify", verb: "Play" },
  { key: "audiomackUrl" as const, label: "Audiomack", verb: "Play" },
  { key: "tiktokUrl" as const, label: "TikTok", verb: "Use video" },
] as const;

export function TipLinkStoreIcon({
  storeKey,
  className = "size-5 shrink-0",
}: {
  storeKey: TipLinkStoreKey;
  className?: string;
}) {
  const icons: Record<
    Exclude<TipLinkStoreKey, "custom" | "tipmanna">,
    ReactNode
  > = {
    appleMusicUrl: (
      <SiApplemusic
        className={className}
        aria-hidden
      />
    ),
    spotifyUrl: (
      <SiSpotify
        className={className}
        aria-hidden
      />
    ),
    audiomackUrl: (
      <SiAudiomack
        className={className}
        aria-hidden
      />
    ),
    tiktokUrl: (
      <SiTiktok
        className={className}
        aria-hidden
      />
    ),
  };
  if (storeKey === "custom") return null;
  if (storeKey === "tipmanna") {
    return (
      <Image
        src="/logos/tipmanna-t.svg"
        alt=""
        width={20}
        height={20}
        className={className}
        aria-hidden
      />
    );
  }
  return icons[storeKey];
}

export type TipLinkStoreRow = {
  key: TipLinkStoreKey;
  label: string;
  url: string | null;
  verb: string;
};

export function buildTipLinkStoreRows(input: {
  appleMusicUrl?: string | null;
  spotifyUrl?: string | null;
  audiomackUrl?: string | null;
  tiktokUrl?: string | null;
  customLinkLabel?: string | null;
  customLinkUrl?: string | null;
  tipmannaProfileUrl?: string | null;
}): TipLinkStoreRow[] {
  const rows: TipLinkStoreRow[] = TIPLINK_STORE_FIELDS.map(
    (field): TipLinkStoreRow => ({
      key: field.key,
      label: field.label,
      url: input[field.key]?.trim() || null,
      verb: field.verb,
    })
  ).filter((row): row is TipLinkStoreRow & { url: string } => Boolean(row.url));

  const customLabel = input.customLinkLabel?.trim();
  const customUrl = input.customLinkUrl?.trim();
  if (customLabel && customUrl) {
    rows.push({
      key: "custom",
      label: customLabel,
      url: customUrl,
      verb: "View",
    });
  }

  const tipmannaUrl = input.tipmannaProfileUrl?.trim();
  if (tipmannaUrl) {
    rows.unshift({
      key: "tipmanna",
      label: "Tipmanna",
      url: tipmannaUrl,
      verb: "ENGAGE",
    });
  }

  return rows;
}

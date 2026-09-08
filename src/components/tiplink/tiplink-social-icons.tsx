import type { ReactNode } from "react";
import { Link2 } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { SiFacebook, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";

export const TIPLINK_SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X" },
  { id: "facebook", label: "Facebook" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "website", label: "Website" },
] as const;

export type TipLinkSocialPlatformId =
  (typeof TIPLINK_SOCIAL_PLATFORMS)[number]["id"];

export function TipLinkSocialIcon({
  platform,
  className = "size-5",
}: {
  platform: string;
  className?: string;
}) {
  const normalized = platform.trim().toLowerCase();
  const icons: Record<string, ReactNode> = {
    instagram: (
      <SiInstagram
        className={className}
        aria-hidden
      />
    ),
    x: (
      <FaXTwitter
        className={className}
        aria-hidden
      />
    ),
    twitter: (
      <FaXTwitter
        className={className}
        aria-hidden
      />
    ),
    facebook: (
      <SiFacebook
        className={className}
        aria-hidden
      />
    ),
    youtube: (
      <SiYoutube
        className={className}
        aria-hidden
      />
    ),
    tiktok: (
      <SiTiktok
        className={className}
        aria-hidden
      />
    ),
    website: (
      <Link2
        className={className}
        aria-hidden
      />
    ),
    link: (
      <Link2
        className={className}
        aria-hidden
      />
    ),
  };
  return (
    icons[normalized] ?? (
      <Link2
        className={className}
        aria-hidden
      />
    )
  );
}

export function tipLinkSocialAriaLabel(platform: string): string {
  const match = TIPLINK_SOCIAL_PLATFORMS.find(
    p => p.id === platform.trim().toLowerCase()
  );
  return match ? `${match.label} profile` : "Social link";
}

import type { VideoBanSurface } from "@/actions/video-surface-ban";

export const HOST_VIDEO_SURFACE_BAN_OPTIONS: Array<{
  value: VideoBanSurface;
  label: string;
}> = [
  { value: "tv", label: "Ban from Tipmanna TV" },
  { value: "explore", label: "Ban from Explore" },
  { value: "discover", label: "Ban from Discover" },
  { value: "internal_search", label: "Ban from site search" },
  { value: "external_search", label: "Ban from Google & search engines" },
];

export function formatVideoSurfaceBanLabels(surfaces: string[]): string {
  const byValue = new Map(
    HOST_VIDEO_SURFACE_BAN_OPTIONS.map(o => [o.value, o.label])
  );
  return surfaces.map(s => byValue.get(s as VideoBanSurface) ?? s).join(", ");
}

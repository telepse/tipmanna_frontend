export type VideoTipReminderSurface =
  | "event_room"
  | "channel_client"
  | "content_client"
  | "tiplink"
  | "explore"
  | "tv_looper"
  | "home_tv_looper"
  | "web_tv_looper";

export type VideoTipReminderSurfaceFlags = {
  flash: boolean;
  inApp: boolean;
};

const SURFACE_FLAGS: Record<
  VideoTipReminderSurface,
  VideoTipReminderSurfaceFlags
> = {
  event_room: { flash: true, inApp: true },
  channel_client: { flash: true, inApp: true },
  content_client: { flash: true, inApp: true },
  tiplink: { flash: true, inApp: true },
  explore: { flash: false, inApp: true },
  tv_looper: { flash: false, inApp: true },
  home_tv_looper: { flash: false, inApp: true },
  web_tv_looper: { flash: false, inApp: true },
};

export function videoTipReminderFlagsForSurface(
  surface: VideoTipReminderSurface
): VideoTipReminderSurfaceFlags {
  return SURFACE_FLAGS[surface];
}

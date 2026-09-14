const PREFIX = "video-tip-reminder";

export function videoTipReminderSessionKey(
  channelId: string,
  offsetSec: number
): string {
  return `${PREFIX}:${channelId}:${offsetSec}`;
}

export function hasVideoTipReminderSessionShown(
  channelId: string,
  offsetSec: number
): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      sessionStorage.getItem(
        videoTipReminderSessionKey(channelId, offsetSec)
      ) === "1"
    );
  } catch {
    return false;
  }
}

export function markVideoTipReminderSessionShown(
  channelId: string,
  offsetSec: number
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      videoTipReminderSessionKey(channelId, offsetSec),
      "1"
    );
  } catch {
    /* ignore quota / privacy mode */
  }
}

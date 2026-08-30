/**
 * When enabled, tip-animation Pusher handling uses one shared broker bind, one shared
 * guard, and one canonical validated-tip publication per accepted bundle.
 *
 * Set `NEXT_PUBLIC_SINGLE_TIP_STREAM_BROKER=false` for explicit legacy/fallback
 * ownership (still one page-level producer via GlobalTipStreamProvider).
 *
 * Unset or any value other than `"false"` enables the broker path (including production).
 */
export function isSingleTipStreamBrokerEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_SINGLE_TIP_STREAM_BROKER;
  return raw !== "false";
}

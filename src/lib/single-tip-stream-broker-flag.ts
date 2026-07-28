/**
 * When enabled, all tip-animation Pusher handling uses one shared bind, one shared
 * guard, and one canonical validated-tip publication per accepted bundle.
 *
 * Set `NEXT_PUBLIC_SINGLE_TIP_STREAM_BROKER=false` to restore legacy per-hook binds.
 * Defaults to enabled outside production.
 */
export function isSingleTipStreamBrokerEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_SINGLE_TIP_STREAM_BROKER;
  if (raw === "false") return false;
  if (raw === "true") return true;
  return process.env.NODE_ENV !== "production";
}

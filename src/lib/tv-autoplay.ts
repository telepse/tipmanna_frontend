import type { TvPlayerRef } from "@/components/tv/tv-player";
import { tracePlayVideoResult } from "@/lib/tvDebugLog";
export function unmuteWithUserGesture(player: TvPlayerRef, source: string): void {
  if (!player.isReady()) return;
  player.unmute();
  player.setVolume(100);
  tracePlayVideoResult(`${source}.play`, player.play());
}

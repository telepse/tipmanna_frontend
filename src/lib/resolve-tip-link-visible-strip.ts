import type { RoomCharacter } from "@/types";

/**
 * TipLink visible strip: SSR first-paint ids win forever; empty-only rescue from live layout or hydrate pool.
 * @see product-behaviors/tiplink-product-behavior.md
 */
export function resolveTipLinkVisibleStrip({
  firstPaint,
  liveStrip,
  hydratedPool,
}: {
  firstPaint: RoomCharacter[];
  liveStrip: RoomCharacter[];
  hydratedPool: RoomCharacter[];
}): RoomCharacter[] {
  if (firstPaint.length > 0) return firstPaint;
  if (liveStrip.length > 0) return liveStrip;
  if (hydratedPool.length > 0) return hydratedPool;
  return [];
}

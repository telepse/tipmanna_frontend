export type ExploreReelAdvanceInput = {
  feedSurfaceActive: boolean;
  slideIndex: number;
  activeIndex: number;
  itemCount: number;
};

/** Whether ENDED on a slide should trigger auto-advance to the next reel. */
export function shouldAdvanceExploreReelOnEnd(
  input: ExploreReelAdvanceInput
): boolean {
  if (!input.feedSurfaceActive) return false;
  if (input.slideIndex !== input.activeIndex) return false;
  if (input.itemCount <= 0) return false;
  return input.activeIndex < input.itemCount - 1;
}

/** Whether finishing the last loaded item should request more feed items. */
export function shouldPaginateExploreReelOnEnd(
  activeIndex: number,
  itemCount: number,
  nearEndSlots: number
): boolean {
  return itemCount > 0 && activeIndex >= itemCount - nearEndSlots;
}

/** Whether ENDED on a slide should notify the feed (advance or paginate). */
export function shouldHandleExploreReelEnded(input: {
  feedSurfaceActive: boolean;
  slideIndex: number;
  activeIndex: number;
}): boolean {
  return input.feedSurfaceActive && input.slideIndex === input.activeIndex;
}

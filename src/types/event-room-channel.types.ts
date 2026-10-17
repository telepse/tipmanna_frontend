/**
 * Video / live channel row passed into the event room chat header & settings.
 */
export interface EventRoomVideoChannel {
  id: string;
  url: string;
  title?: string;
  isDefault?: boolean;
  durationSeconds?: number;
  /** Present on full channel rows from the events API; omitted on restricted placeholders. */
  mediaSource?: "linked" | "native";
}

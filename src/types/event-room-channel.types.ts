/**
 * Video / live channel row passed into the event room chat header & settings.
 */
export interface EventRoomVideoChannel {
  id: string;
  url: string;
  title?: string;
  isDefault?: boolean;
  durationSeconds?: number;
}

import { Event } from "./event.types";

export interface Channel {
  id: string;
  url: string;
  title: string;
  event: Event;
  durationSeconds: number;
}

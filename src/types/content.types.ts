import { Channel } from "./channel.types";
import { Event } from "./event.types";

export type Content = {
  channel?: Channel;
  id: string;
  url: string;
  event?: Event;
};

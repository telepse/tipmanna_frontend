import { create } from "zustand";

type StoredEvent = {
  id: string;
  name?: string;
};

type EventStore = {
  event?: StoredEvent;
  storeEvent: (event: StoredEvent) => void;
};

export const useStoredEvent = create<EventStore>(set => ({
  event: undefined,
  storeEvent: event => set({ event }),
}));

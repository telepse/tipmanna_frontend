"use client";

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

type ScreenSettings = {
  eventId: string | null;
  background: string;
  hideProgress: boolean;
  showLatest: boolean;

  // actions
  hydrate: (data: Partial<ScreenSettings>) => void;
  optimisticUpdate: (data: Partial<ScreenSettings>) => void;
};

export const useScreenSettings = create<ScreenSettings>()(
  subscribeWithSelector(
    persist(
      set => ({
        eventId: null,
        background: "/default.png",
        hideProgress: false,
        showLatest: false,

        hydrate: data =>
          set(state => ({
            ...state,
            ...data,
          })),

        optimisticUpdate: data =>
          set(state => ({
            ...state,
            ...data,
          })),
      }),
      {
        name: "screen-settings", // localStorage key
        partialize: state => ({
          background: state.background,
          hideProgress: state.hideProgress,
          showLatest: state.showLatest,
        }),
      }
    )
  )
);

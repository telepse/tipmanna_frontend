"use client";

import { useEffect, useRef, useState } from "react";

import {
  isPhoneSurface,
  resolveTvSurfaceMode,
  type TvSurfaceMode,
} from "@/lib/tv-surface-layout";

const WIDTH_DEBOUNCE_MS = 150;

type Viewport = { width: number; height: number; landscape: boolean };

function readViewport(): Viewport {
  if (typeof window === "undefined") {
    return { width: 0, height: 0, landscape: false };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    width,
    height,
    landscape: width > height,
  };
}

function isOrientationDrivenChange(
  prev: Viewport | null,
  next: Viewport
): boolean {
  if (!prev) return false;
  return prev.landscape !== next.landscape;
}

function isPhoneLandscapeMode(mode: TvSurfaceMode | null): boolean {
  return mode === "phoneLandscape";
}

export function useTvSurfaceMode(): {
  mode: TvSurfaceMode | null;
  width: number;
  height: number;
  ready: boolean;
  isPhone: boolean;
  isWide: boolean;
} {
  const [viewport, setViewport] = useState<Viewport>(() => readViewport());
  const [debouncedViewport, setDebouncedViewport] = useState<Viewport>(() =>
    readViewport()
  );
  const prevViewportRef = useRef<Viewport | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const applyViewport = (next: Viewport) => {
      const prev = prevViewportRef.current;
      prevViewportRef.current = next;
      setViewport(next);

      const nextMode = resolveTvSurfaceMode(next);
      const prevMode = prev ? resolveTvSurfaceMode(prev) : null;
      const orientationChange = isOrientationDrivenChange(prev, next);
      const involvesPhoneLandscape =
        isPhoneLandscapeMode(nextMode) ||
        isPhoneLandscapeMode(prevMode) ||
        orientationChange;

      if (involvesPhoneLandscape) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        setDebouncedViewport(next);
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedViewport(next);
        debounceTimerRef.current = null;
      }, WIDTH_DEBOUNCE_MS);
    };

    const onResize = () => applyViewport(readViewport());

    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const mode = resolveTvSurfaceMode(debouncedViewport);
  const ready = debouncedViewport.width > 0 && debouncedViewport.height > 0;

  return {
    mode,
    width: debouncedViewport.width,
    height: debouncedViewport.height,
    ready,
    isPhone: isPhoneSurface(mode),
    isWide: mode === "tablet" || mode === "desktop",
  };
}

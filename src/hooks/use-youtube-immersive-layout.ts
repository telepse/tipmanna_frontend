"use client";

import { useEffect, useState } from "react";
import {
  classificationToImmersiveLayoutMode,
  fetchYoutubeAspectInfo,
  type ImmersiveLayoutMode,
  type YoutubeAspectInfo,
} from "@/lib/youtube-immersive-meta";

export function useYoutubeImmersiveLayout(
  videoUrl: string | null | undefined
): ImmersiveLayoutMode {
  const { layoutMode } = useYoutubeVideoAspect(videoUrl);
  return layoutMode;
}

export function useYoutubeVideoAspect(videoUrl: string | null | undefined): {
  aspectInfo: YoutubeAspectInfo | null;
  layoutMode: ImmersiveLayoutMode;
  isLoading: boolean;
} {
  const [aspectInfo, setAspectInfo] = useState<YoutubeAspectInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setAspectInfo(null);

    void (async () => {
      const info = await fetchYoutubeAspectInfo(videoUrl);
      if (cancelled) return;
      setAspectInfo(info);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [videoUrl]);

  const layoutMode: ImmersiveLayoutMode =
    aspectInfo != null
      ? classificationToImmersiveLayoutMode(aspectInfo.classification)
      : "landscape_video";

  return { aspectInfo, layoutMode, isLoading };
}

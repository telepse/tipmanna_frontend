"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_000;
const ACTIVITY_INTERVAL_MS = 10_000;

interface UseWakeLockOptions {
  enabled: boolean;
}

interface UseWakeLockReturn {
  isSupported: boolean;
  isActive: boolean;
  degradedMode: boolean;
}

export function useWakeLock({
  enabled,
}: UseWakeLockOptions): UseWakeLockReturn {
  const [isSupported, setIsSupported] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [degradedMode, setDegradedMode] = useState(false);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const stopActivitySimulation = useCallback(() => {
    if (activityIntervalRef.current) {
      clearInterval(activityIntervalRef.current);
      activityIntervalRef.current = null;
    }
  }, []);

  const startActivitySimulation = useCallback(() => {
    stopActivitySimulation();
    activityIntervalRef.current = setInterval(() => {
      document.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          clientX: Math.random(),
          clientY: Math.random(),
        })
      );
    }, ACTIVITY_INTERVAL_MS);
  }, [stopActivitySimulation]);

  const cleanupVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute("src");
      if (videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
      }
      videoRef.current = null;
    }
  }, []);

  const setupVideo = useCallback(() => {
    if (videoRef.current) {
      return;
    }

    const video = document.createElement("video");
    video.src = "/assets/silent-video.mp4";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("playsinline", "true");

    Object.assign(video.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "2px",
      height: "2px",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "-9999",
    });

    document.body.appendChild(video);
    videoRef.current = video;

    video.play().catch(() => {
      setDegradedMode(true);
    });
  }, []);

  const releaseFallbacks = useCallback(() => {
    stopActivitySimulation();
    cleanupVideo();
    setDegradedMode(false);
  }, [stopActivitySimulation, cleanupVideo]);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
      setIsActive(false);
    }
  }, []);

  const activateWakeLock = useCallback(async (): Promise<boolean> => {
    if (!("wakeLock" in navigator)) {
      setIsSupported(false);
      return false;
    }

    if (wakeLockRef.current) {
      return true;
    }

    try {
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      setIsActive(true);
      retryCountRef.current = 0;

      sentinel.addEventListener("release", () => {
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null;
          setIsActive(false);
        }
      });

      return true;
    } catch {
      setIsActive(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      releaseWakeLock();
      releaseFallbacks();
      retryCountRef.current = 0;
      return;
    }

    let cancelled = false;

    const init = async () => {
      const success = await activateWakeLock();
      if (cancelled) return;

      if (!success && !("wakeLock" in navigator)) {
        setIsSupported(false);
      }

      if (!success) {
        setupVideo();
        startActivitySimulation();
      }
    };

    void init();

    return () => {
      cancelled = true;
      releaseWakeLock();
      releaseFallbacks();
    };
  }, [
    enabled,
    activateWakeLock,
    releaseWakeLock,
    setupVideo,
    startActivitySimulation,
    releaseFallbacks,
  ]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!("wakeLock" in navigator)) return;
      if (wakeLockRef.current) return;
      if (retryCountRef.current >= MAX_RETRIES) return;

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      retryTimeoutRef.current = setTimeout(() => {
        void (async () => {
          retryCountRef.current++;
          const success = await activateWakeLock();
          if (success) {
            releaseFallbacks();
          } else {
            startActivitySimulation();
            if (!videoRef.current) {
              setupVideo();
            }
          }
        })();
      }, RETRY_DELAY_MS);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [
    enabled,
    activateWakeLock,
    startActivitySimulation,
    setupVideo,
    releaseFallbacks,
  ]);

  return { isSupported, isActive, degradedMode };
}

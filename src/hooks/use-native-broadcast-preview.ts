"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type NativeCaptureMode = "camera" | "screen";
export type NativeOrientation = "landscape" | "portrait";

export type NativeBroadcastPreviewState = {
  active: boolean;
  error: string | null;
  stream: MediaStream | null;
};

function orientationConstraints(
  orientation: NativeOrientation
): MediaTrackConstraints {
  if (orientation === "portrait") {
    return {
      width: { ideal: 720 },
      height: { ideal: 1280 },
      aspectRatio: { ideal: 9 / 16 },
    };
  }
  return {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    aspectRatio: { ideal: 16 / 9 },
  };
}

/**
 * Local publisher preview only (getUserMedia / getDisplayMedia).
 * Does not join Daily or start provider billing — real ingest stays gated (E1-FA-02+).
 */
export function useNativeBroadcastPreview() {
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<NativeBroadcastPreviewState>({
    active: false,
    error: null,
    stream: null,
  });

  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setState({ active: false, error: null, stream: null });
  }, []);

  const startPreview = useCallback(
    async (captureMode: NativeCaptureMode, orientation: NativeOrientation) => {
      stopPreview();
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        setState({
          active: false,
          error: "media_devices_unavailable",
          stream: null,
        });
        return;
      }
      try {
        const audio: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
        };
        let stream: MediaStream;
        if (captureMode === "screen") {
          const display = await navigator.mediaDevices.getDisplayMedia({
            video: orientationConstraints(orientation),
            audio,
          });
          stream = display;
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              ...orientationConstraints(orientation),
              facingMode: "user",
            },
            audio,
          });
        }
        streamRef.current = stream;
        setState({ active: true, error: null, stream });
      } catch (e) {
        const message = e instanceof Error ? e.message : "preview_start_failed";
        setState({ active: false, error: message, stream: null });
      }
    },
    [stopPreview]
  );

  useEffect(() => () => stopPreview(), [stopPreview]);

  return { ...state, startPreview, stopPreview };
}

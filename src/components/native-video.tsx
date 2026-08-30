"use client";

import { forwardRef, type VideoHTMLAttributes, useEffect, useRef } from "react";
import { patchNativeVideoElement } from "@/lib/native-video-patch";

export type NativeVideoProps = VideoHTMLAttributes<HTMLVideoElement>;

/**
 * Wrapper for native `<video>` with Tipmanna mobile playback restrictions applied
 * synchronously (ref) and via the global MutationObserver guard.
 */
export const NativeVideo = forwardRef<HTMLVideoElement, NativeVideoProps>(
  function NativeVideo({ ...props }, ref) {
    const innerRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      const el = innerRef.current;
      if (el) patchNativeVideoElement(el);
    }, []);

    return (
      <video
        ref={node => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
          if (node) patchNativeVideoElement(node);
        }}
        {...props}
      />
    );
  }
);

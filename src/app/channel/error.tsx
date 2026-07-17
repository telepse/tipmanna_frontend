"use client";

import { SegmentErrorFallback } from "@/components/segment-error-fallback";

export default function ChannelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentErrorFallback
      error={error}
      reset={reset}
      segment="Channel"
      homeHref="/explore"
    />
  );
}

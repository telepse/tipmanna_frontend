"use client";

import { SegmentErrorFallback } from "@/components/segment-error-fallback";

export default function DiscoverError({
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
      segment="Discover"
      homeHref="/discover"
    />
  );
}

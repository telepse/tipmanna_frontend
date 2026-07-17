"use client";

import { SegmentErrorFallback } from "@/components/segment-error-fallback";

export default function TvRouteError({
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
      segment="Tipmanna TV"
      homeHref="/tv"
    />
  );
}

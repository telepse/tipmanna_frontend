"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  segment?: string;
  homeHref?: string;
};

export function SegmentErrorFallback({
  error,
  reset,
  segment = "This section",
  homeHref = "/explore",
}: Props) {
  useEffect(() => {
    console.error(`[${segment}/error]`, error.message, error.digest ?? "");
  }, [error, segment]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-lg font-semibold">{segment} ran into a problem</h1>
      <p className="max-w-md text-center text-sm text-neutral-600">
        {error.message || "Something unexpected happened. You can try again."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className="rounded-lg bg-black px-4 py-2 text-sm text-white"
          onClick={() => reset()}
        >
          Try again
        </button>
        <Link
          href={homeHref}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

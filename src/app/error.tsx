"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error.message, error.digest ?? "");
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-center text-sm text-neutral-600">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-lg bg-black px-4 py-2 text-sm text-white"
          onClick={() => reset()}
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

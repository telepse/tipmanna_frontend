"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error.message, error.digest ?? "");
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-md text-center text-sm text-neutral-600">
            {error.message || "A critical error occurred."}
          </p>
          <button
            type="button"
            className="rounded-lg bg-black px-4 py-2 text-sm text-white"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

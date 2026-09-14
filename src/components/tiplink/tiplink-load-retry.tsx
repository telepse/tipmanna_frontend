"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function TipLinkLoadRetry({ message }: { message?: string }) {
  const router = useRouter();

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-white">
        Could not load TipLink
      </h1>
      <p className="max-w-md text-sm text-white/70">
        {message?.trim() ||
          "The page took too long to respond. Check your connection and try again."}
      </p>
      <Button
        type="button"
        onClick={() => router.refresh()}
      >
        Retry
      </Button>
    </div>
  );
}

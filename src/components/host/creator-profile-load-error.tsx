"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type Props = {
  username: string;
};

export function CreatorProfileLoadError({ username }: Props) {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Could not load creator profile</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        We could not reach the server for @{username.replace(/^@/, "")}. This is
        usually temporary — try again in a moment.
      </p>
      <Button
        type="button"
        onClick={() => router.refresh()}
      >
        Try again
      </Button>
    </div>
  );
}

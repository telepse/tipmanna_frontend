import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type StreamingB1E2ESeed = {
  hostId: string;
  hostSlug: string;
  eventId: string;
  broadcastId: string;
  primaryToken: string;
  hostToken: string;
  tipperUser: {
    id: string;
    fullName: string;
    email: string;
    username: string;
    role: "TIPPER";
  };
  hostUser: {
    id: string;
    fullName: string;
    email: string;
    username: string;
    role: "HOST";
    hostSessionExpiresAt: string;
  };
};

export function streamingB1SeedPath(): string {
  return (
    process.env.STREAMING_B1_E2E_SEED_PATH?.trim() ??
    path.join(process.cwd(), ".streaming-b1-e2e.json")
  );
}

export function loadStreamingB1Seed(): StreamingB1E2ESeed {
  const seedPath = streamingB1SeedPath();
  if (!existsSync(seedPath)) {
    throw new Error(
      `Missing ${seedPath}. Run backend scripts/streaming-b1-e2e-seed.ts against disposable 5439 first.`
    );
  }
  return JSON.parse(readFileSync(seedPath, "utf8")) as StreamingB1E2ESeed;
}

export function applyStreamingB1SeedEnv(seed: StreamingB1E2ESeed): void {
  process.env.STREAMING_B1_E2E_EVENT_ID = seed.eventId;
  process.env.STREAMING_B1_E2E_HOST_SLUG = seed.hostSlug;
}

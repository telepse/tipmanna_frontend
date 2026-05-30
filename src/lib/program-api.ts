import type { ProgramBootstrap } from "@/lib/program-types";

const apiBase = () =>
  (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

export async function fetchGlobalProgramBootstrap(
  enforcementId: string
): Promise<ProgramBootstrap | null> {
  const base = apiBase();
  if (!base) return null;
  const res = await fetch(
    `${base}/tv/program/${encodeURIComponent(enforcementId)}/bootstrap`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return (await res.json()) as ProgramBootstrap;
}

export async function fetchCommunityProgramBootstrap(
  communityId: string,
  enforcementId: string
): Promise<ProgramBootstrap | null> {
  const base = apiBase();
  if (!base) return null;
  const res = await fetch(
    `${base}/communities/${encodeURIComponent(communityId)}/tv/program/${encodeURIComponent(enforcementId)}/bootstrap`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return (await res.json()) as ProgramBootstrap;
}

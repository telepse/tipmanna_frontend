/** Server-only explore SSR observability (no PII). */

export const EXPLORE_SSR_OBS_ENABLED =
  process.env.EXPLORE_SSR_OBS_ENABLED !== "false";

export function logExploreSsrBoot(opts: {
  outcome: "ok" | "timeout" | "empty" | "error";
  durationMs: number;
}): void {
  if (!EXPLORE_SSR_OBS_ENABLED) return;
  console.info(
    JSON.stringify({
      event: "explore_ssr_boot",
      outcome: opts.outcome,
      durationMs: Math.round(opts.durationMs),
    })
  );
}

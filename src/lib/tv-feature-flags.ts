/** TV performance feature flags (all default off). */

export function isTvScheduleSwrEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_TV_SCHEDULE_SWR === "true" ||
    process.env.NEXT_PUBLIC_TV_SCHEDULE_SWR === "1"
  );
}

export function isTvLazySsrCharactersEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_TV_LAZY_SSR_CHARACTERS === "true" ||
    process.env.NEXT_PUBLIC_TV_LAZY_SSR_CHARACTERS === "1"
  );
}

export function isTvDirectScheduleFetchEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_TV_DIRECT_SCHEDULE_FETCH === "true" ||
    process.env.NEXT_PUBLIC_TV_DIRECT_SCHEDULE_FETCH === "1"
  );
}

export function isTvSsrScheduleSeedEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_TV_SSR_SCHEDULE === "true" ||
    process.env.NEXT_PUBLIC_TV_SSR_SCHEDULE === "1"
  );
}

/**
 * Diagnostic startup-latency tracing (Phase 1). Behaviour-neutral: only enables
 * the `[TV_STARTUP_TRACE]` observability layer. `?tvDebug=1` also enables it
 * (handled in tv-startup-trace). Never gate TV product behaviour on this flag.
 */
export function isTvStartupTraceFlagEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED === "1"
  );
}

/**
 * Phase A — single intentional startup schedule network request.
 * Default DISABLED. Set to `1` or `true` to enable; requires a frontend rebuild
 * (`NEXT_PUBLIC_*` env vars are inlined at build time).
 */
export function isTvSingleStartupScheduleEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE === "true" ||
    process.env.NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE === "1"
  );
}

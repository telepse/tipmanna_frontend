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

export const EVENT_TIMEZONE_OPTIONS = [
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Lisbon",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

export function detectBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
  } catch {
    return "Europe/London";
  }
}

export function buildEventTimezoneOptions(detected?: string): string[] {
  const base = [...EVENT_TIMEZONE_OPTIONS];
  const tz = detected?.trim() || detectBrowserTimeZone();
  if (tz && !base.includes(tz as (typeof EVENT_TIMEZONE_OPTIONS)[number])) {
    return [tz, ...base];
  }
  return base;
}

export function defaultEventTimeZone(): string {
  const detected = detectBrowserTimeZone();
  const options = buildEventTimezoneOptions(detected);
  return options[0] ?? "Europe/London";
}

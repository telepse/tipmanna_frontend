/** Immutable tipper slug pattern: tipper{middle}{2digits} */
export const TIPPER_DISPLAY_HANDLE_REGEX = /^tipper([a-z0-9]+)(\d{2})$/i;

export function slugDigits(immutableSlug: string): string {
  const trimmed = immutableSlug.trim();
  if (trimmed.length < 2) return trimmed;
  return trimmed.slice(-2);
}

/** Middle segment for the edit UI; digits always come from immutable slug. */
export function splitTipperDisplayHandle(
  displayUsername: string,
  immutableSlug: string
): { middle: string; digits: string } {
  const digits = slugDigits(immutableSlug);
  const trimmed = displayUsername.trim();
  const match = trimmed.match(TIPPER_DISPLAY_HANDLE_REGEX);

  if (match) {
    let middle = match[1].toLowerCase();
    if (middle.startsWith("tipper")) {
      const slugMiddle = middleFromSlug(immutableSlug);
      if (slugMiddle) middle = slugMiddle;
    }
    return { middle, digits };
  }

  const slugMiddle = middleFromSlug(immutableSlug);
  if (slugMiddle) {
    return { middle: slugMiddle, digits };
  }

  return { middle: trimmed.toLowerCase().replace(/[^a-z0-9]/g, ""), digits };
}

function middleFromSlug(immutableSlug: string): string | null {
  const match = immutableSlug.trim().match(TIPPER_DISPLAY_HANDLE_REGEX);
  return match ? match[1].toLowerCase() : null;
}

export function sanitizeTipperHandleMiddle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function composeTipperDisplayHandle(
  middle: string,
  immutableSlug: string
): string {
  const sanitized = sanitizeTipperHandleMiddle(middle);
  if (!sanitized) {
    throw new Error("Display name segment is required");
  }
  const digits = slugDigits(immutableSlug);
  if (!/^\d{2}$/.test(digits)) {
    throw new Error("Invalid tipper profile slug");
  }
  return `tipper${sanitized}${digits}`;
}

export function formatTipperDisplayLabel(
  displayUsername: string,
  immutableSlug?: string | null
): string {
  const trimmed = displayUsername.trim();
  if (!trimmed) return "";
  if (TIPPER_DISPLAY_HANDLE_REGEX.test(trimmed)) return trimmed;
  if (immutableSlug && TIPPER_DISPLAY_HANDLE_REGEX.test(immutableSlug)) {
    return immutableSlug;
  }
  return trimmed;
}

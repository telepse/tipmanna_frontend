export const DEFAULT_THANK_YOU_PREFIX =
  "Thank you for your engagement and support";

export const THANK_YOU_PREFIX_MAX = 100;

const PLACEHOLDER_AMOUNT = "{amount}";
const PLACEHOLDER_CHARACTER = "{character}";
const PLACEHOLDER_TIPPED_AT = "{tippedAt}";
const PLACEHOLDER_HOST_FIRST_NAME = "{hostFirstName}";
const PLACEHOLDER_CREATOR_PAGE_URL = "{creatorPageUrl}";
const PLACEHOLDER_COMMUNITY_NAME = "{communityName}";
const PLACEHOLDER_COMMUNITY_PAGE_URL = "{communityPageUrl}";

export type SplitThankYouMessageResult = {
  prefix: string;
  suffix: string | null;
  unmatchedTail: string | null;
};

function splitLongCustomWithAmount(
  trimmed: string
): SplitThankYouMessageResult {
  return {
    prefix: trimmed.slice(0, THANK_YOU_PREFIX_MAX),
    suffix: null,
    unmatchedTail: trimmed.slice(THANK_YOU_PREFIX_MAX),
  };
}

/** Split a stored template into editable prefix and system remainder. */
export function splitThankYouMessage(
  stored: string | null | undefined
): SplitThankYouMessageResult {
  const trimmed = stored?.trim() ?? "";
  if (!trimmed) {
    return {
      prefix: DEFAULT_THANK_YOU_PREFIX,
      suffix: null,
      unmatchedTail: null,
    };
  }

  const suffixPatterns = [
    ` from ${PLACEHOLDER_COMMUNITY_NAME} ${PLACEHOLDER_COMMUNITY_PAGE_URL} ${PLACEHOLDER_AMOUNT} ${PLACEHOLDER_CHARACTER} ${PLACEHOLDER_TIPPED_AT}`,
    ` from ${PLACEHOLDER_HOST_FIRST_NAME} ${PLACEHOLDER_CREATOR_PAGE_URL} ${PLACEHOLDER_AMOUNT} ${PLACEHOLDER_CHARACTER} ${PLACEHOLDER_TIPPED_AT}`,
    / from .+ \S+ \{amount\} \{character\} \{tippedAt\}$/,
  ];

  for (const pattern of suffixPatterns) {
    if (typeof pattern === "string") {
      if (trimmed.endsWith(pattern.slice(1))) {
        const idx = trimmed.lastIndexOf(" from ");
        if (idx > 0) {
          return {
            prefix: trimmed.slice(0, idx),
            suffix: trimmed.slice(idx + 1),
            unmatchedTail: null,
          };
        }
      }
    } else if (pattern.test(trimmed)) {
      const idx = trimmed.lastIndexOf(" from ");
      if (idx > 0) {
        return {
          prefix: trimmed.slice(0, idx),
          suffix: trimmed.slice(idx + 1),
          unmatchedTail: null,
        };
      }
    }
  }

  if (
    trimmed.includes(PLACEHOLDER_AMOUNT) &&
    trimmed.length > THANK_YOU_PREFIX_MAX
  ) {
    return splitLongCustomWithAmount(trimmed);
  }

  return { prefix: trimmed, suffix: null, unmatchedTail: null };
}

/** Rejoin editable prefix with preserved custom tail before submit. */
export function reassembleThankYouForSubmit(
  prefix: string | null | undefined,
  unmatchedTail: string | null | undefined
): string | null {
  const trimmedPrefix = prefix?.trim();
  const trimmedTail = unmatchedTail?.trim();
  if (!trimmedPrefix && !trimmedTail) return null;
  if (!trimmedTail) return trimmedPrefix ?? null;
  if (!trimmedPrefix) return trimmedTail;
  return `${trimmedPrefix}${trimmedTail}`;
}

export type ThankYouRemainderContext = {
  hostFirstName?: string | null;
  communityName?: string | null;
};

/** Human-readable description of the non-editable remainder tippers will see. */
export function describeThankYouRemainder(
  ctx?: ThankYouRemainderContext
): string {
  if (ctx?.communityName?.trim()) {
    return `from ${ctx.communityName.trim()}, your community page, plus the tip amount, character, and time`;
  }
  const name = ctx?.hostFirstName?.trim() || "your name";
  return `from ${name}, your creator page, plus the tip amount, character, and time`;
}

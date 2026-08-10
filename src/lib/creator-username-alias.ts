import { normalizeCreatorUsername } from "@/lib/creator-profile-url";

const ALIAS_STORAGE_KEY = "tipmanna:creator-username-aliases";

export const CREATOR_USERNAME_CHANGED_EVENT = "tipmanna:creator-username-changed";

export type CreatorUsernameChangedDetail = {
  previousUsername: string;
  username: string;
};

function canUseSessionStorage(): boolean {
  return typeof sessionStorage !== "undefined";
}

function readAliasMap(): Record<string, string> {
  if (!canUseSessionStorage()) return {};
  try {
    const raw = sessionStorage.getItem(ALIAS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAliasMap(map: Record<string, string>) {
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.setItem(ALIAS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

/** Remember a username rename so stale feed/cache handles resolve to the latest handle. */
export function recordCreatorUsernameChange(
  previousUsername: string,
  nextUsername: string
): void {
  const previous = normalizeCreatorUsername(previousUsername).toLowerCase();
  const next = normalizeCreatorUsername(nextUsername);
  if (!previous || !next || previous === next.toLowerCase()) return;

  const aliases = readAliasMap();

  for (const [from, to] of Object.entries(aliases)) {
    if (to.toLowerCase() === previous) {
      aliases[from] = next;
    }
  }

  aliases[previous] = next;
  writeAliasMap(aliases);
}

/** Follow rename chain for a possibly stale username (case-insensitive keys). */
export function resolveCreatorUsernameAlias(
  username: string | null | undefined
): string | null {
  const initial = normalizeCreatorUsername(username ?? "");
  if (!initial) return null;

  const aliases = readAliasMap();
  let current = initial;
  const seen = new Set<string>();

  while (true) {
    const key = current.toLowerCase();
    if (seen.has(key)) break;
    seen.add(key);

    const next = aliases[key];
    if (!next || next.toLowerCase() === key) break;
    current = normalizeCreatorUsername(next);
  }

  return current;
}

export function dispatchCreatorUsernameChanged(
  detail: CreatorUsernameChangedDetail
): void {
  if (typeof window === "undefined") return;
  recordCreatorUsernameChange(detail.previousUsername, detail.username);
  window.dispatchEvent(
    new CustomEvent<CreatorUsernameChangedDetail>(CREATOR_USERNAME_CHANGED_EVENT, {
      detail,
    })
  );
}

export function patchExploreFeedHostUsername(
  items: unknown[],
  previousUsername: string,
  nextUsername: string
): unknown[] {
  const previous = normalizeCreatorUsername(previousUsername).toLowerCase();
  const next = normalizeCreatorUsername(nextUsername);
  if (!previous || !next || previous === next.toLowerCase()) return items;

  return items.map(item => {
    if (!item || typeof item !== "object") return item;

    const row = item as {
      event?: { username?: string | null };
      host?: { username?: string | null };
    };
    const current =
      row.event?.username?.trim().replace(/^@/, "") ??
      row.host?.username?.trim().replace(/^@/, "") ??
      "";
    if (!current || current.toLowerCase() !== previous) return item;

    const patched = {
      ...(item as Record<string, unknown>),
    };
    if (row.event && typeof row.event === "object") {
      patched.event = { ...row.event, username: next };
    }
    if (row.host && typeof row.host === "object") {
      patched.host = { ...row.host, username: next };
    }
    return patched;
  });
}

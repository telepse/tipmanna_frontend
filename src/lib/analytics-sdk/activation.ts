export type ActivationRecord = {
  activationId: string;
  ready: boolean;
  active: boolean;
  endedAt?: number;
};

const memory = new Map<string, ActivationRecord>();

function storageKey(
  sessionId: string,
  surface: string,
  videoChannelId: string
): string {
  return `aa:${sessionId}:${surface}:${videoChannelId}`;
}

function compositeKey(
  sessionId: string,
  surface: string,
  videoChannelId: string
): string {
  return `${sessionId}\0${surface}\0${videoChannelId}`;
}

function readSession(key: string): ActivationRecord | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw || !raw.trim()) return null;
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as ActivationRecord;
      if (parsed.endedAt != null) return null;
      if (typeof parsed.activationId === "string") return parsed;
      return null;
    }
    return {
      activationId: raw.trim(),
      ready: true,
      active: true,
    };
  } catch {
    return null;
  }
}

function writeSession(key: string, record: ActivationRecord): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(record));
  } catch {
    /* quota / private mode */
  }
}

function removeSession(key: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function getOpenRecord(
  sessionId: string,
  surface: string,
  videoChannelId: string
): ActivationRecord | null {
  const ck = compositeKey(sessionId, surface, videoChannelId);
  const mem = memory.get(ck);
  if (mem && mem.endedAt == null) return mem;

  const sk = storageKey(sessionId, surface, videoChannelId);
  const fromStore = readSession(sk);
  if (fromStore) {
    memory.set(ck, fromStore);
    return fromStore;
  }
  return null;
}

/** Mint or reuse when ready and active; never restore ended activations. */
export function ensureOpenActivation(
  sessionId: string,
  surface: string,
  videoChannelId: string,
  state: { ready: boolean; active: boolean },
  mint: () => string
): string | null {
  if (!state.ready || !state.active) return null;

  const existing = getOpenRecord(sessionId, surface, videoChannelId);
  if (existing) return existing.activationId;

  const record: ActivationRecord = {
    activationId: mint(),
    ready: true,
    active: true,
  };
  const ck = compositeKey(sessionId, surface, videoChannelId);
  memory.set(ck, record);
  writeSession(storageKey(sessionId, surface, videoChannelId), record);
  return record.activationId;
}

/** Mint or reuse activation (ready∧active assumed). */
export function getOrCreateActivationId(
  sessionId: string,
  surface: string,
  videoChannelId: string,
  mint: () => string
): string {
  return (
    ensureOpenActivation(
      sessionId,
      surface,
      videoChannelId,
      { ready: true, active: true },
      mint
    ) ?? mint()
  );
}

/** End activation — key removed; remount must mint new. */
export function markActivationEnded(
  sessionId: string,
  surface: string,
  videoChannelId: string
): void {
  const ck = compositeKey(sessionId, surface, videoChannelId);
  memory.delete(ck);
  removeSession(storageKey(sessionId, surface, videoChannelId));
}

/** @deprecated Use markActivationEnded */
export function clearActivation(
  sessionId: string,
  surface: string,
  videoChannelId: string
): void {
  markActivationEnded(sessionId, surface, videoChannelId);
}

export function resetActivationStateForTests(): void {
  memory.clear();
}

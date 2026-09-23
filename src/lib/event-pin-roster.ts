export const MAX_PINNED_ROSTER_ITEMS = 2;

export type PinRosterItem = {
  id: string;
  name: string;
  isPinned: boolean;
  amountReceived: number | string;
};

export type EventPinRoster = {
  contributionType: string;
  items: PinRosterItem[];
};

export function pinnedRosterItems<T extends { isPinned?: boolean }>(
  items: T[],
  max = MAX_PINNED_ROSTER_ITEMS
): T[] {
  return items.filter(item => item.isPinned).slice(0, max);
}

export function pinnedForScreenDisplay<
  T extends { isPinned?: boolean; id?: string; name: string },
>(items: T[] | undefined | null): T[] {
  if (!items?.length) return [];
  const hasPinFlag = items.some(item => typeof item.isPinned === "boolean");
  const pinned = hasPinFlag ? items.filter(item => item.isPinned) : items;
  return pinned.slice(0, MAX_PINNED_ROSTER_ITEMS);
}

export type PinnedAmountSnapshotRow = {
  id: string;
  name: string;
  amountReceived: number | string;
};

/** Apply public pin-amount snapshot onto full roster (event room only — do not replace list). */
export function applyPinnedAmountSnapshot<
  T extends {
    id?: string;
    name: string;
    isPinned?: boolean;
    amountReceived?: number | string;
  },
>(current: T[], snapshot: PinnedAmountSnapshotRow[]): T[] {
  const byId = new Map(snapshot.map(row => [row.id, row]));
  return current.map(item => {
    const id = item.id?.trim();
    if (!id) {
      return { ...item, isPinned: false };
    }
    const row = byId.get(id);
    if (!row) {
      return { ...item, isPinned: false };
    }
    return {
      ...item,
      isPinned: true,
      amountReceived: row.amountReceived,
    };
  });
}

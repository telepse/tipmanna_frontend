/** TV remote / keyboard helpers for watch portal shell (not YouTube iframe). */

export const WATCH_FOCUSABLE_SELECTOR =
  ".watch-tab, .watch-tile, .watch-transport-btn, a.watch-tab, button.watch-tile";

export type WatchRemoteKeyAction =
  | { type: "move"; delta: -1 | 1 }
  | { type: "activate" }
  | { type: "escape" }
  | { type: "ignore" };

export function mapWatchRemoteKey(event: KeyboardEvent): WatchRemoteKeyAction {
  const key = event.key;
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return { type: "move", delta: -1 };
  }
  if (key === "ArrowRight" || key === "ArrowDown") {
    return { type: "move", delta: 1 };
  }
  if (key === "Enter" || key === " ") {
    return { type: "activate" };
  }
  if (key === "Escape") {
    return { type: "escape" };
  }
  return { type: "ignore" };
}

export function listWatchFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(WATCH_FOCUSABLE_SELECTOR)
  ).filter(el => !el.hasAttribute("disabled") && el.tabIndex !== -1);
}

export function focusWatchSibling(root: HTMLElement, delta: -1 | 1): void {
  const items = listWatchFocusables(root);
  if (!items.length) return;
  const active = document.activeElement as HTMLElement | null;
  const index = items.findIndex(el => el === active || el.contains(active));
  if (index < 0) {
    items[0].focus();
    return;
  }
  const next = (index + delta + items.length) % items.length;
  items[next].focus();
}

export function activateWatchFocused(): void {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return;
  if (active.tagName === "A" || active.tagName === "BUTTON") {
    active.click();
    return;
  }
  const link = active.closest("a");
  if (link) {
    link.click();
  }
}

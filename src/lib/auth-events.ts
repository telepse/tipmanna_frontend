export const AUTH_CHANGED_EVENT = "tipmanna:auth-changed";

export function dispatchAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

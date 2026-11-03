export const RECEIVE_PROBE_STORAGE_KEY = "finish-a-receive-probe-config";

const PROBE_DEVICE_ID_KEY = "finish-a-receive-probe-device-id";

/** Stable operator device label for receive-probe-session (no secrets). */
export function getOrCreateProbeDeviceId(): string {
  if (typeof sessionStorage === "undefined") {
    return "probe-browser";
  }
  const existing = sessionStorage.getItem(PROBE_DEVICE_ID_KEY)?.trim();
  if (existing) return existing;
  const created = `probe-${crypto.randomUUID().slice(0, 12)}`;
  sessionStorage.setItem(PROBE_DEVICE_ID_KEY, created);
  return created;
}

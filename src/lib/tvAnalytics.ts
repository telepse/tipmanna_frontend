/* eslint-disable @typescript-eslint/no-explicit-any */
export function track(event: string, data?: any) {
  fetch("/api/tv/analytics", {
    method: "POST",
    body: JSON.stringify({
      event,
      data,
      timestamp: Date.now(),
    }),
  });
}

import { describe, expect, it } from "vitest";

import { formatNativeBroadcastActionError } from "../native-broadcast-action-error";

describe("formatNativeBroadcastActionError", () => {
  it("surfaces paid-pack eligibility copy from API message", () => {
    expect(
      formatNativeBroadcastActionError(
        new Error(
          "No paid streaming pack on this host. Complete pack checkout first, then activate credits."
        )
      )
    ).toContain("Complete pack checkout first");
  });

  it("maps NO_QUALIFYING_PACK_ORDER code-like messages", () => {
    expect(
      formatNativeBroadcastActionError(new Error("NO_QUALIFYING_PACK_ORDER"))
    ).toContain("Complete pack checkout first");
  });

  it("softens Next unexpected-response / Workbox no-response transport failures", () => {
    expect(
      formatNativeBroadcastActionError(
        new Error("An unexpected response was received from the server.")
      )
    ).toMatch(/browser transport/i);

    expect(
      formatNativeBroadcastActionError(
        new Error(
          'no-response :: [{"url":"https://www.tipmanna.tv/host/x/broadcast/y"}]'
        )
      )
    ).toMatch(/browser transport/i);
  });
});

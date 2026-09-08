import { describe, expect, it } from "vitest";

import { resolveWizardPostSubmitDestination } from "@/lib/post-host-auth-destination";

describe("resolveWizardPostSubmitDestination", () => {
  it("uses host session username, not tipper slug", () => {
    expect(
      resolveWizardPostSubmitDestination({
        hostSessionUsername: "creator",
        createEventResponse: {
          host: { username: "other", eventSlug: "my-slug" },
        },
      })
    ).toBe("/@creator");
  });

  it("falls back to host username from create response", () => {
    expect(
      resolveWizardPostSubmitDestination({
        createEventResponse: {
          host: { username: "creator", eventSlug: "my-slug" },
        },
      })
    ).toBe("/@creator");
  });

  it("prefers host handle from response over missing session", () => {
    expect(
      resolveWizardPostSubmitDestination({
        createEventResponse: {
          host: { username: "jane", eventSlug: "evt" },
        },
      })
    ).toBe("/@jane");
  });

  it("falls back to host dashboard when username missing but slug present", () => {
    expect(
      resolveWizardPostSubmitDestination({
        createEventResponse: {
          host: { eventSlug: "my-slug" },
        },
      })
    ).toBe("/host/my-slug");
  });
});

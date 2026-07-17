import { describe, expect, it } from "vitest";

import { mapCoOwnerInviteErrors } from "@/lib/coowner-invite-error.util";

describe("mapCoOwnerInviteErrors", () => {
  it("maps structured validation details to fields", () => {
    const mapped = mapCoOwnerInviteErrors({
      error: {
        message: "Conflict",
        details: [
          { path: "coOwnerName", message: "Name mismatch" },
          { path: "coOwnerEmail", message: "Duplicate email" },
        ],
      },
    });
    expect(mapped.name).toBe("Name mismatch");
    expect(mapped.email).toBe("Duplicate email");
  });

  it("maps global name mismatch message to name field", () => {
    const mapped = mapCoOwnerInviteErrors(
      {
        error: {
          message:
            "Co-owner email exists with name (Jane Doe). Please use the same name.",
        },
      },
      "Co-owner email exists with name (Jane Doe). Please use the same name."
    );
    expect(mapped.name).toContain("Jane Doe");
  });

  it("maps per-video duplicate name message to name field", () => {
    const mapped = mapCoOwnerInviteErrors(
      null,
      "This co-owner name is already used for this video"
    );
    expect(mapped.name).toContain("already used");
  });

  it("maps YouTube duplicate co-owner message", () => {
    const mapped = mapCoOwnerInviteErrors(
      null,
      "This YouTube video already has an approved co-owner on Tipmanna."
    );
    expect(mapped.email).toContain("approved co-owner");
  });
});

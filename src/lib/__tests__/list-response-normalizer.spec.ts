import { describe, expect, it } from "vitest";

import { normalizeListPayload } from "../list-response-normalizer";

describe("normalizeListPayload", () => {
  it("returns raw arrays unchanged", () => {
    expect(normalizeListPayload([{ id: "1" }])).toEqual([{ id: "1" }]);
  });

  it("unwraps paginated { data } envelopes", () => {
    expect(
      normalizeListPayload({
        data: [{ id: "a" }],
        pagination: { page: 1, total: 1 },
      })
    ).toEqual([{ id: "a" }]);
  });

  it("returns empty array for invalid payloads", () => {
    expect(normalizeListPayload(null)).toEqual([]);
    expect(normalizeListPayload({ pagination: {} })).toEqual([]);
  });
});

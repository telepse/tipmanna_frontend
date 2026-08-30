import { describe, expect, it } from "vitest";

import { normalizeListPayload } from "../list-response-normalizer";

describe("loadExploreCatalog latest normalization", () => {
  it("unwraps paginated latest payloads for the discover rails", () => {
    const latest = normalizeListPayload<{ id: string }>({
      data: [{ id: "ch-1" }],
      pagination: { page: 1, limit: 20, total: 1 },
    });
    expect(latest).toEqual([{ id: "ch-1" }]);
  });

  it("unwraps paginated featured and spotlight payloads", () => {
    const featured = normalizeListPayload<{ id: string }>({
      data: [{ id: "feat-1" }],
    });
    const spotlight = normalizeListPayload<{ id: string }>({
      data: [{ id: "spot-1" }],
    });
    expect(featured).toEqual([{ id: "feat-1" }]);
    expect(spotlight).toEqual([{ id: "spot-1" }]);
  });
});

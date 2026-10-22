import { describe, expect, it } from "vitest";

import {
  PAGE_LINKED_V2_QUEUE_MARKER,
  PAGE_LINKED_V2_TRANSPORT_REF,
} from "../page-linked-v2-chunk-anchor";
import { QUEUE_STORAGE_KEY } from "../queue";

describe("page-linked-v2-chunk-anchor", () => {
  it("exports queue marker required by S2 page-linked scans", () => {
    expect(PAGE_LINKED_V2_QUEUE_MARKER).toBe(QUEUE_STORAGE_KEY);
    expect(PAGE_LINKED_V2_QUEUE_MARKER).toBe(
      "tipmanna-analytics-sdk-v2-queue"
    );
  });

  it("retains v2 transport module in page-linked graph", () => {
    expect(typeof PAGE_LINKED_V2_TRANSPORT_REF).toBe("function");
  });
});

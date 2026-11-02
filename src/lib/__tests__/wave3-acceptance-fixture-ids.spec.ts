import { describe, expect, it } from "vitest";

import {
  E2E_FEED_ALL_ITEMS,
} from "../e2e-explore-fixtures";
import {
  e2eExploreFeedChannelId,
  e2eExploreFeedEventId,
} from "../wave3-acceptance-fixture-ids";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("wave3 acceptance fixture ids", () => {
  it("emits UUID-shaped explore feed channel and event ids", () => {
    expect(e2eExploreFeedChannelId(1)).toMatch(UUID_RE);
    expect(e2eExploreFeedEventId(1)).toMatch(UUID_RE);
    expect(e2eExploreFeedChannelId(1)).not.toBe(e2eExploreFeedEventId(1));
  });

  it("E2E feed pool uses UUID channel ids for ingest", () => {
    for (const item of E2E_FEED_ALL_ITEMS.slice(0, 5)) {
      expect(item.id).toMatch(UUID_RE);
      expect(item.event.id).toMatch(UUID_RE);
    }
  });
});

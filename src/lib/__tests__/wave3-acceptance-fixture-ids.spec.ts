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

  it("E2E feed pool binds acceptance staging event/channel for ingest", () => {
    for (const item of E2E_FEED_ALL_ITEMS.slice(0, 3)) {
      expect(item.id).toBe("17456868-db4a-4386-a2b3-334f25b83fc4");
      expect(item.event.id).toBe(
        "0fff0bb8-3a0f-46fe-8a92-da80bb26343f"
      );
    }
  });
});

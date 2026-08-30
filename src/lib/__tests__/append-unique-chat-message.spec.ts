import { describe, expect, it } from "vitest";
import { appendUniqueChatMessage } from "@/lib/append-unique-chat-message";
import type { Message } from "@/types";

const row = (id: string, transactionId?: string): Message =>
  ({
    id,
    sender: "a",
    createdAt: "now",
    text: "I just sent",
    ...(transactionId ? { transactionId } : {}),
  }) as Message;

describe("appendUniqueChatMessage", () => {
  it("appends a new message", () => {
    expect(appendUniqueChatMessage([], row("1", "tx-1"))).toHaveLength(1);
  });

  it("dedupes by transactionId across different row ids", () => {
    const next = appendUniqueChatMessage(
      [row("1", "tx-1")],
      row("2", "tx-1")
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe("1");
  });

  it("dedupes by id when incoming lacks transactionId", () => {
    const next = appendUniqueChatMessage([row("same-id", "tx-1")], row("same-id"));
    expect(next).toHaveLength(1);
  });
});

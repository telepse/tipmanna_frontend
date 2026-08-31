import type { Message } from "@/types";

function messageKey(message: Message): string {
  const tx =
    typeof message.transactionId === "string"
      ? message.transactionId.trim()
      : "";
  if (tx) return `tx:${tx}`;
  return `id:${message.id}`;
}

/** Append a live chat row once per transaction (or id). */
export function appendUniqueChatMessage(
  prev: Message[],
  incoming: Message
): Message[] {
  const key = messageKey(incoming);
  if (prev.some(row => messageKey(row) === key)) {
    return prev;
  }
  if (incoming.id && prev.some(row => row.id === incoming.id)) {
    return prev;
  }
  const incomingTx =
    typeof incoming.transactionId === "string"
      ? incoming.transactionId.trim()
      : "";
  if (
    incomingTx &&
    prev.some(row => row.transactionId?.trim() === incomingTx)
  ) {
    return prev;
  }
  return [...prev, incoming];
}

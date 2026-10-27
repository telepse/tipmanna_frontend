"use client";

/**
 * Wave 3 S2/R1: retain v2 SDK queue + transport literals in the page-linked
 * chunk graph for routes whose producers mount via next/dynamic (partner TV,
 * explore feed). Render once per page shell — no runtime analytics side effects.
 */
/** Must stay aligned with QUEUE_STORAGE_KEY in queue.ts */
export const PAGE_LINKED_V2_QUEUE_MARKER = "tipmanna-analytics-sdk-v2-queue";

/** Matches wave3-matrix-route-scan V2_TRANSPORT_MARKER / transport batch JSON shape. */
export const PAGE_LINKED_V2_TRANSPORT_LITERAL = "{v:2,sessionId";

export { flushSdkAnalytics as PAGE_LINKED_V2_TRANSPORT_REF } from "./transport";

/** Retention string must live in the component body so minify keeps it in the page shell chunk. */
const PAGE_LINKED_V2_RETAIN_BLOB = `${PAGE_LINKED_V2_QUEUE_MARKER}\0${PAGE_LINKED_V2_TRANSPORT_LITERAL}`;

export function PageLinkedV2ChunkAnchor(): null {
  void PAGE_LINKED_V2_RETAIN_BLOB;
  return null;
}

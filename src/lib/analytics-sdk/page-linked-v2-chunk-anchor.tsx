"use client";

/**
 * Wave 3 S2/R1: retain v2 SDK queue + transport literals in the page-linked
 * chunk graph for routes whose producers mount via next/dynamic (partner TV,
 * explore feed). Render once per page shell — no runtime analytics side effects.
 */
import { QUEUE_STORAGE_KEY } from "./queue";
import { flushSdkAnalytics } from "./transport";

/** Exported for unit tests and webpack retention. */
export const PAGE_LINKED_V2_QUEUE_MARKER = QUEUE_STORAGE_KEY;

/** Ensures transport module (contains `{v:2,sessionId` batch shape) stays in graph. */
export const PAGE_LINKED_V2_TRANSPORT_REF = flushSdkAnalytics;

export function PageLinkedV2ChunkAnchor(): null {
  return null;
}

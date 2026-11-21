"use client";

import { QUEUE_STORAGE_KEY } from "@/lib/analytics-sdk/queue";
import { flushSdkAnalytics } from "@/lib/analytics-sdk/transport";

/** Wave 3 S2: keep v2 SDK modules in explore layout page-linked graph. */
const _pageLinkedQueue = QUEUE_STORAGE_KEY;
const _pageLinkedTransport = flushSdkAnalytics;
void _pageLinkedQueue;
void _pageLinkedTransport;

export function ExploreV2PageLink(): null {
  return null;
}

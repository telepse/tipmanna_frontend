"use client";

import { PageLinkedV2ChunkAnchor } from "@/lib/analytics-sdk/page-linked-v2-chunk-anchor";

/** Host-gated TipLink preview routes — session bootstrap before landing client mounts. */
export function TipLinkPreviewPageShell() {
  return <PageLinkedV2ChunkAnchor />;
}

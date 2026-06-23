"use client";

import { useEffect } from "react";
import { installChunkLoadRecovery } from "@/lib/chunk-load-recovery";

export function ChunkLoadRecovery() {
  useEffect(() => {
    installChunkLoadRecovery();
  }, []);
  return null;
}

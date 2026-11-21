"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { issueEventBroadcastReceiveProbeSessionAction } from "@/actions/event-broadcast";
import {
  getOrCreateProbeDeviceId,
  RECEIVE_PROBE_STORAGE_KEY,
} from "@/lib/daily-receive-probe-config";
import type { DailyReceiveProbeConfig } from "@/components/streaming/daily-receive-probe-client";

function OpenReceiveProbeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("Preparing receive-only probe session…");

  useEffect(() => {
    const eventId = searchParams.get("eventId")?.trim();
    const broadcastId = searchParams.get("broadcastId")?.trim();
    if (!eventId || !broadcastId) {
      setMessage("Missing eventId or broadcastId query parameters.");
      return;
    }

    const probeDeviceId =
      searchParams.get("probeDeviceId")?.trim() || getOrCreateProbeDeviceId();

    let cancelled = false;
    void (async () => {
      const result = await issueEventBroadcastReceiveProbeSessionAction(
        eventId,
        broadcastId,
        probeDeviceId,
        { preferHostSession: true }
      );
      if (cancelled) return;
      if (!result.success || !result.data) {
        setMessage(
          result.message ?? result.error ?? "Failed to issue receive-probe session."
        );
        return;
      }
      const rp = result.data.receiveProbe;
      const config: DailyReceiveProbeConfig = {
        broadcastId,
        roomName: rp.roomName,
        roomUrl: rp.roomUrl,
        meetingToken: rp.meetingToken,
      };
      sessionStorage.setItem(RECEIVE_PROBE_STORAGE_KEY, JSON.stringify(config));
      router.replace("/e2e/daily-receive-probe");
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="p-4 font-mono text-sm">
      <p>{message}</p>
      <p className="mt-2 text-muted-foreground">
        Tokens stay off the URL; session is stored in sessionStorage then the
        probe page opens automatically.
      </p>
    </main>
  );
}

/** Operator entry: authenticated server action → probe UI (no manual JSON wiring). */
export default function OpenDailyReceiveProbePage() {
  return (
    <Suspense fallback={<main className="p-4 text-sm">Loading…</main>}>
      <OpenReceiveProbeInner />
    </Suspense>
  );
}

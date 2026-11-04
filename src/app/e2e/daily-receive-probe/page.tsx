"use client";

import { useEffect, useState } from "react";

import {
  DailyReceiveProbeClient,
  type DailyReceiveProbeConfig,
} from "@/components/streaming/daily-receive-probe-client";

import { RECEIVE_PROBE_STORAGE_KEY } from "@/lib/daily-receive-probe-config";

/** Pre-configured receive-only probe (operator opens after API receive-probe-session). */
export default function DailyReceiveProbePage() {
  const [config, setConfig] = useState<DailyReceiveProbeConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mock = params.get("mock");
      if (mock === "1" || mock === "tone" || mock === "silent") {
        setConfig({
          broadcastId: params.get("broadcastId") ?? "mock-broadcast-id",
          roomName: params.get("roomName") ?? "tm-mock-room",
          roomUrl: "https://tipmanna.mock.daily.co/tm-mock-room",
          meetingToken: `mock-receive-probe-${(params.get("broadcastId") ?? "mock").slice(0, 8)}-local`,
          mockAudio: mock === "silent" ? "silent" : "tone",
        });
        return;
      }
      const raw = sessionStorage.getItem(RECEIVE_PROBE_STORAGE_KEY);
      if (raw) {
        setConfig(JSON.parse(raw) as DailyReceiveProbeConfig);
        return;
      }
      setLoadError(
        "Missing probe config. Open /e2e/daily-receive-probe/open?eventId=…&broadcastId=… while signed in as broadcast manager."
      );
    } catch {
      setLoadError("Invalid probe config in sessionStorage");
    }
  }, []);

  if (loadError) {
    return (
      <main className="p-4 font-mono text-sm">
        <p>{loadError}</p>
        <p className="mt-2 text-muted-foreground">
          Mock self-test (synthetic media, not Daily evidence):
          /e2e/daily-receive-probe?mock=1 or ?mock=silent
        </p>
      </main>
    );
  }

  if (!config) {
    return <main className="p-4 text-sm">Loading probe…</main>;
  }

  return <DailyReceiveProbeClient config={config} />;
}

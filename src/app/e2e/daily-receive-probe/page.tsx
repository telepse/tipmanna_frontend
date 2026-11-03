"use client";

import { useEffect, useState } from "react";

import {
  DailyReceiveProbeClient,
  type DailyReceiveProbeConfig,
} from "@/components/streaming/daily-receive-probe-client";

const STORAGE_KEY = "finish-a-receive-probe-config";

/** Pre-configured receive-only probe (operator opens after API receive-probe-session). */
export default function DailyReceiveProbePage() {
  const [config, setConfig] = useState<DailyReceiveProbeConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        setConfig(JSON.parse(raw) as DailyReceiveProbeConfig);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("mock") === "1") {
        setConfig({
          broadcastId: params.get("broadcastId") ?? "mock-broadcast-id",
          roomName: params.get("roomName") ?? "tm-mock-room",
          roomUrl: "https://tipmanna.mock.daily.co/tm-mock-room",
          meetingToken: `mock-receive-probe-${(params.get("broadcastId") ?? "mock").slice(0, 8)}-local`,
        });
        return;
      }
      setLoadError(
        "Missing probe config. Call POST …/receive-probe-session then set sessionStorage finish-a-receive-probe-config before opening this page."
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
          Mock self-test: /e2e/daily-receive-probe?mock=1
        </p>
      </main>
    );
  }

  if (!config) {
    return <main className="p-4 text-sm">Loading probe…</main>;
  }

  return <DailyReceiveProbeClient config={config} />;
}

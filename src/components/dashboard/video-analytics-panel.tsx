"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { getHostVideoAnalyticsAction } from "@/actions/host";
import { useHostID } from "@/hooks/useHostID";
import type { RootState } from "@/redux/store";

export function VideoAnalyticsPanel() {
  const user = useSelector((s: RootState) => s.auth.user);
  const hostId = useHostID();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<unknown>(null);

  const load = useCallback(async () => {
    if (!hostId || !user?.id) {
      setError("Sign in as host to view analytics.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await getHostVideoAnalyticsAction(hostId);
    setLoading(false);
    if (!res.success) {
      setError(res.message ?? "Failed to load");
      setPayload(null);
      return;
    }
    setPayload(res.data);
  }, [hostId, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="bg-card space-y-4 rounded-md p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h5 className="text-xl font-medium">Video & surface analytics</h5>
          <p className="text-muted-foreground text-sm">
            Payment initiations by surface, device, watch time (watch_duration
            events), and engagement (share/save from TV).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {payload != null && (
        <pre className="bg-muted/50 max-h-[480px] overflow-auto rounded-md p-4 text-left text-xs">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

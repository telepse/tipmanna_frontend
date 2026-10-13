"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  activateNativeStreamingWallet,
  broadcastAuthHeader,
  createEventBroadcastIntent,
  fetchCurrentEventBroadcast,
  preflightEventBroadcast,
  startEventBroadcast,
  stopEventBroadcast,
  type EventBroadcastRow,
} from "@/lib/event-broadcast-client";
import {
  useNativeBroadcastPreview,
  type NativeCaptureMode,
  type NativeOrientation,
} from "@/hooks/use-native-broadcast-preview";

type Props = {
  eventId: string;
  /** Host account (event owner user id match) */
  isHost: boolean;
  isCohost: boolean;
  eventChannelId?: string;
};

function newKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/**
 * LIVE-009 — local preview + mock-friendly broadcast API controls.
 * Real Daily/YouTube ingest and public starts remain gated (E1-FA / flags).
 */
export function NativeBroadcastPanel({
  eventId,
  isHost,
  isCohost,
  eventChannelId,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [row, setRow] = useState<EventBroadcastRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [orientation, setOrientation] = useState<NativeOrientation>("landscape");
  const [captureMode, setCaptureMode] = useState<NativeCaptureMode>("camera");
  const preview = useNativeBroadcastPreview();

  const canManage = isHost || isCohost;
  const authHeader = useMemo(() => broadcastAuthHeader(), []);
  const canStart = canManage && Boolean(authHeader);
  const canStop = canManage && Boolean(authHeader);

  const phaseLabel = useMemo(() => row?.phase ?? "none", [row?.phase]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = preview.stream;
    if (preview.stream) {
      void el.play().catch(() => {});
    }
  }, [preview.stream]);

  const refresh = useCallback(async () => {
    if (!authHeader) {
      setError("host_auth_required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const current = await fetchCurrentEventBroadcast(eventId, authHeader);
      setRow(current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "status_unavailable");
    } finally {
      setLoading(false);
    }
  }, [eventId, authHeader]);

  const run = useCallback(
    async (label: string, fn: () => Promise<void>) => {
      if (!authHeader) {
        setError("host_auth_required");
        return;
      }
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        await fn();
        setMessage(label);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "action_failed");
      } finally {
        setLoading(false);
      }
    },
    [authHeader, refresh]
  );

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Native streaming controls require host or cohost access.
      </p>
    );
  }

  if (!authHeader) {
    return (
      <p className="text-sm text-amber-800">
        Sign in as host or cohost to manage native broadcast (session token required).
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-3 space-y-3 text-sm">
      <div>
        <h4 className="font-semibold">Native broadcast</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Preview uses your camera or screen locally only. Provider billing and YouTube
          ingest stay off until staging experiments pass. Public starts remain disabled
          globally.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1 text-xs">
          Orientation
          <select
            className="border rounded px-1 py-0.5"
            value={orientation}
            onChange={e => setOrientation(e.target.value as NativeOrientation)}
          >
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs">
          Capture
          <select
            className="border rounded px-1 py-0.5"
            value={captureMode}
            onChange={e => setCaptureMode(e.target.value as NativeCaptureMode)}
          >
            <option value="camera">Camera</option>
            <option value="screen">Screen</option>
          </select>
        </label>
      </div>

      <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-md bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          playsInline
          muted
          autoPlay
        />
        {!preview.active ? (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-gray-300 px-2 text-center">
            Start local preview to check framing (no provider connection).
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton
          disabled={loading || preview.active}
          onClick={() => void preview.startPreview(captureMode, orientation)}
        >
          Start preview
        </ActionButton>
        <ActionButton disabled={loading || !preview.active} onClick={() => preview.stopPreview()}>
          Stop preview
        </ActionButton>
      </div>
      {preview.error ? <p className="text-xs text-destructive">{preview.error}</p> : null}

      <div className="flex flex-wrap gap-2 border-t pt-2">
        <ActionButton disabled={loading} onClick={() => void refresh()}>
          {loading ? "Working…" : "Refresh status"}
        </ActionButton>
        <ActionButton
          disabled={loading}
          onClick={() =>
            void run("Wallet activation requested", async () => {
              await activateNativeStreamingWallet(eventId, authHeader);
            })
          }
        >
          Activate credits
        </ActionButton>
        <ActionButton
          disabled={loading}
          onClick={() =>
            void run("Broadcast intent created", async () => {
              const result = await createEventBroadcastIntent(eventId, authHeader, {
                idempotencyKey: newKey("create"),
                eventChannelId,
              });
              setRow(prev =>
                prev?.id === result.broadcastId
                  ? prev
                  : {
                      id: result.broadcastId,
                      ownerHostId: "",
                      phase: "preflight",
                      billableEndedAt: null,
                      recordedStopReason: null,
                      eventChannelId: eventChannelId ?? null,
                      initiatedByUserId: null,
                      initiatedByRole: null,
                      providerIngestActive: false,
                      updatedAt: new Date().toISOString(),
                    }
              );
            })
          }
        >
          Create intent
        </ActionButton>
        <ActionButton
          disabled={loading || !row?.id}
          onClick={() =>
            void run("Preflight complete", async () => {
              if (!row?.id) return;
              await preflightEventBroadcast(eventId, row.id, authHeader, newKey("preflight"));
            })
          }
        >
          Preflight
        </ActionButton>
        {canStart ? (
          <ActionButton
            disabled={loading || !row?.id}
            onClick={() =>
              void run("Start accepted (mock provider)", async () => {
                if (!row?.id) return;
                await startEventBroadcast(eventId, row.id, authHeader, newKey("start"));
              })
            }
          >
            Start
          </ActionButton>
        ) : null}
        {canStop ? (
          <ActionButton
            disabled={loading || !row?.id}
            onClick={() =>
              void run("Stop requested", async () => {
                if (!row?.id) return;
                await stopEventBroadcast(eventId, row.id, authHeader, {
                  idempotencyKey: newKey("stop"),
                  reason: "host_stop",
                });
              })
            }
          >
            Stop
          </ActionButton>
        ) : null}
      </div>

      <div className="text-xs space-y-1">
        <p>
          Phase: <strong>{phaseLabel}</strong>
          {row?.providerIngestActive ? " · ingest active" : null}
        </p>
        {isCohost && !isHost ? (
          <p className="text-muted-foreground">
            Cohost: stop may be denied if you did not initiate this broadcast (server enforced).
          </p>
        ) : null}
        {message ? <p className="text-emerald-700">{message}</p> : null}
        {error ? (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="text-xs rounded border px-2 py-1 disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

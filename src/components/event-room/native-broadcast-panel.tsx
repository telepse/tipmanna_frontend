"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  activateNativeStreamingWalletAction,
  createEventBroadcastIntentAction,
  fetchCurrentEventBroadcastAction,
  issueEventBroadcastPublisherSessionAction,
  preflightEventBroadcastAction,
  startEventBroadcastAction,
  stopEventBroadcastAction,
  type EventBroadcastActionOptions,
} from "@/actions/event-broadcast";
import type { ActionResult } from "@/lib/action-fetch";
import {
  getNativeBroadcastDeviceSessionId,
  type EventBroadcastRow,
  type PublisherSessionResult,
} from "@/lib/event-broadcast-client";
import {
  useNativeBroadcastPreview,
  type NativeCaptureMode,
  type NativeOrientation,
} from "@/hooks/use-native-broadcast-preview";
import { useDailyPublisherRoom } from "@/hooks/use-daily-publisher-room";
import { useNativeBroadcastStatusPoll } from "@/hooks/use-native-broadcast-status-poll";
import { usePublisherSessionSync } from "@/hooks/use-publisher-session-sync";

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

function unwrapBroadcastAction<T>(res: ActionResult<T>): T {
  if (!res.success) {
    throw new Error(res.error ?? "action_failed");
  }
  return res.data as T;
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
  const [publisherSession, setPublisherSession] =
    useState<PublisherSessionResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [orientation, setOrientation] =
    useState<NativeOrientation>("landscape");
  const [captureMode, setCaptureMode] = useState<NativeCaptureMode>("camera");
  const preview = useNativeBroadcastPreview();
  const dailyRoom = useDailyPublisherRoom();

  const canManage = isHost || isCohost;
  const canStart = canManage;
  const canStop = canManage;
  /** Host dashboard owner surface uses hostToken; event-room cohost uses scoped cohostToken. */
  const broadcastAuthOptions = useMemo<EventBroadcastActionOptions>(
    () => ({ preferHostSession: isHost && !isCohost }),
    [isHost, isCohost]
  );

  const phaseLabel = useMemo(() => row?.phase ?? "none", [row?.phase]);
  const pollActive = row?.phase === "starting" || row?.phase === "live";

  useNativeBroadcastStatusPoll(pollActive && canManage, () => void refresh());

  usePublisherSessionSync({
    eventId,
    broadcastId: row?.id,
    dailyRoomReady: Boolean(row?.dailyRoomReady),
    broadcastAuthOptions,
    publisherSession,
    setPublisherSession,
  });

  useEffect(() => {
    if (row?.phase === "stopped") {
      setPublisherSession(null);
    }
  }, [row?.phase]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = preview.stream;
    if (preview.stream) {
      void el.play().catch(() => {});
    }
  }, [preview.stream]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const current = unwrapBroadcastAction(
        await fetchCurrentEventBroadcastAction(eventId, broadcastAuthOptions)
      );
      setRow(current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "status_unavailable");
    } finally {
      setLoading(false);
    }
  }, [eventId, broadcastAuthOptions]);

  const run = useCallback(
    async (label: string, fn: () => Promise<void>) => {
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
    [refresh]
  );

  if (!canManage) {
    return (
      <p className="text-muted-foreground text-sm">
        Native streaming controls require host or cohost access.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-white p-3 text-sm">
      <div>
        <h4 className="font-semibold">Native broadcast</h4>
        <p className="text-muted-foreground mt-1 text-xs">
          Preview uses your camera or screen locally only. On staging mock mode,
          provider Start is allowed for entitled hosts while public viewer
          starts stay disabled.
        </p>
        <ol className="text-muted-foreground mt-2 list-decimal space-y-0.5 pl-4 text-xs">
          <li>Start preview → Activate credits → Create intent → Preflight</li>
          <li>Claim publisher → Join provider room → Start (mock worker)</li>
          <li>Stop when finished; leave provider room and stop preview</li>
        </ol>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1 text-xs">
          Orientation
          <select
            className="rounded border px-1 py-0.5"
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
            className="rounded border px-1 py-0.5"
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
          <p className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs text-gray-300">
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
        <ActionButton
          disabled={loading || !preview.active}
          onClick={() => {
            void dailyRoom.leave();
            preview.stopPreview();
          }}
        >
          Stop preview
        </ActionButton>
      </div>
      {preview.error ? (
        <p className="text-destructive text-xs">{preview.error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t pt-2">
        <ActionButton
          disabled={loading}
          onClick={() => void refresh()}
        >
          {loading ? "Working…" : "Refresh status"}
        </ActionButton>
        <ActionButton
          disabled={loading}
          onClick={() =>
            void run("Wallet activation requested", async () => {
              unwrapBroadcastAction(
                await activateNativeStreamingWalletAction(
                  eventId,
                  broadcastAuthOptions
                )
              );
            })
          }
        >
          Activate credits
        </ActionButton>
        <ActionButton
          disabled={loading}
          onClick={() =>
            void run("Broadcast intent created", async () => {
              const result = unwrapBroadcastAction(
                await createEventBroadcastIntentAction(
                  eventId,
                  {
                    idempotencyKey: newKey("create"),
                    eventChannelId,
                  },
                  broadcastAuthOptions
                )
              );
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
                      dailyRoomReady: false,
                      youtubeBroadcastPrepared: false,
                      liveStartedAt: null,
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
              unwrapBroadcastAction(
                await preflightEventBroadcastAction(
                  eventId,
                  row.id,
                  newKey("preflight"),
                  broadcastAuthOptions
                )
              );
            })
          }
        >
          Preflight
        </ActionButton>
        <ActionButton
          disabled={loading || !row?.id}
          onClick={() =>
            void run("Publisher slot claimed", async () => {
              if (!row?.id) return;
              const session = unwrapBroadcastAction(
                await issueEventBroadcastPublisherSessionAction(
                  eventId,
                  row.id,
                  getNativeBroadcastDeviceSessionId(),
                  broadcastAuthOptions
                )
              );
              setPublisherSession(session);
            })
          }
        >
          Claim publisher
        </ActionButton>
        <ActionButton
          disabled={
            loading ||
            !publisherSession?.dailyPublisher ||
            !preview.active ||
            dailyRoom.phase === "joining"
          }
          onClick={() => {
            if (!publisherSession) return;
            void dailyRoom.join(publisherSession, preview.stream);
          }}
        >
          {dailyRoom.phase === "mock_joined" || dailyRoom.phase === "joined"
            ? "In provider room"
            : "Join provider room"}
        </ActionButton>
        <ActionButton
          disabled={loading || dailyRoom.phase === "idle"}
          onClick={() => void dailyRoom.leave()}
        >
          Leave provider room
        </ActionButton>
        {canStart ? (
          <ActionButton
            disabled={loading || !row?.id}
            onClick={() =>
              void run("Start accepted (mock provider)", async () => {
                if (!row?.id) return;
                unwrapBroadcastAction(
                  await startEventBroadcastAction(
                    eventId,
                    row.id,
                    newKey("start"),
                    broadcastAuthOptions
                  )
                );
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
                await dailyRoom.leave();
                unwrapBroadcastAction(
                  await stopEventBroadcastAction(
                    eventId,
                    row.id,
                    {
                      idempotencyKey: newKey("stop"),
                      reason: "host_stop",
                    },
                    broadcastAuthOptions
                  )
                );
              })
            }
          >
            Stop
          </ActionButton>
        ) : null}
      </div>

      <div className="space-y-1 text-xs">
        <p>
          Phase: <strong>{phaseLabel}</strong>
          {row?.providerIngestActive ? " · ingest active" : null}
          {row?.dailyRoomReady ? " · Daily room ready" : null}
          {row?.youtubeBroadcastPrepared ? " · YouTube draft bound" : null}
          {row?.phase === "live" && row.liveStartedAt
            ? ` · live since ${row.liveStartedAt.slice(0, 19)}Z`
            : null}
        </p>
        <p className="text-muted-foreground">
          Ingest readiness:{" "}
          {row?.providerIngestActive
            ? "provider ingest active"
            : row?.dailyRoomReady
              ? "room provisioned (awaiting ingest confirm)"
              : "not provisioned"}
          {" · "}
          YouTube lifecycle:{" "}
          {row?.phase === "live"
            ? "live (confirmed phase)"
            : row?.youtubeBroadcastPrepared
              ? "prepared (not live)"
              : "not prepared"}
        </p>
        {isCohost && !isHost ? (
          <p className="text-muted-foreground">
            Cohost: stop may be denied if you did not initiate this broadcast
            (server enforced).
          </p>
        ) : null}
        {publisherSession ? (
          <p className="text-muted-foreground">
            Publisher lease until{" "}
            {publisherSession.lease.expiresAt.slice(0, 19)}Z
            {publisherSession.dailyPublisher
              ? " · scoped Daily token issued"
              : " · Daily token pending room"}
            {publisherSession.rtmpIngestConfigured
              ? " · RTMP active server-side (not exposed here)"
              : null}
          </p>
        ) : null}
        {dailyRoom.phase !== "idle" ? (
          <p className="text-muted-foreground">
            Provider room:{" "}
            {dailyRoom.phase === "mock_joined"
              ? "mock joined (local tracks only; real Daily when mode=real)"
              : dailyRoom.phase === "joined"
                ? "Daily WebRTC joined"
                : dailyRoom.phase}
          </p>
        ) : null}
        {dailyRoom.error ? (
          <p
            className="text-destructive"
            role="alert"
          >
            {dailyRoom.error}
          </p>
        ) : null}
        {message ? <p className="text-emerald-700">{message}</p> : null}
        {error ? (
          <p
            className="text-destructive"
            role="alert"
          >
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
      className="rounded border px-2 py-1 text-xs disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

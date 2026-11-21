"use client";

import { useCallback, useEffect, useState } from "react";

import {
  acquireDirectorLeaseAction,
  activateAdvancedStudioAction,
  applyAssistedPresetAction,
  createContributorInviteAction,
  downgradeAdvancedStudioAction,
  fetchAssistedPresetsAction,
  fetchHostBrandingRotationAction,
  fetchInteractionAlertsAction,
  patchAssistedPresetAction,
  patchAdvancedProgrammeAction,
  prepareAdvancedStudioAction,
  redeemContributorInviteAction,
  type AssistedPresetId,
} from "@/actions/event-advanced-studio";
import { HostStreamBrandingPreview } from "@/components/host/host-stream-branding-preview";
import type { ActionResult } from "@/lib/action-fetch";
import {
  getNativeBroadcastDeviceSessionId,
  type EventBroadcastRow,
} from "@/lib/event-broadcast-client";

type Props = {
  eventId: string;
  broadcast: EventBroadcastRow;
  onRefresh: () => Promise<void>;
};

type PresetRow = {
  presetId: AssistedPresetId;
  enabled: boolean;
  manualOverride: boolean;
};

const PRESET_LABELS: Record<AssistedPresetId, string> = {
  stable_source_failover: "Stable source failover",
  louder_audio: "Louder host audio",
  activity_priority: "Activity split",
};

function unwrap<T>(res: ActionResult<T>): T {
  if (!res.success) throw new Error(res.error ?? "action_failed");
  return res.data as T;
}

/**
 * B1 Advanced Studio + Finish B host controls (LIVE-011–018).
 */
export function AdvancedStudioPanel({ eventId, broadcast, onRefresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [pastedInviteToken, setPastedInviteToken] = useState("");
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [activeOverlay, setActiveOverlay] = useState<{
    slotId: string;
    label: string;
    cycleIndex: number;
    secondsIntoSlot: number;
  } | null>(null);
  const [alerts, setAlerts] = useState<
    Array<{ id: string; kind: string; occurredAt: string }>
  >([]);
  const deviceId = getNativeBroadcastDeviceSessionId();

  const loadFinishB = useCallback(async () => {
    const [p, b, a] = await Promise.all([
      fetchAssistedPresetsAction(eventId, broadcast.id, {
        preferHostSession: true,
      }),
      fetchHostBrandingRotationAction(eventId, broadcast.id, {
        preferHostSession: true,
      }),
      fetchInteractionAlertsAction(eventId, broadcast.id, {
        preferHostSession: true,
      }),
    ]);
    if (p.success && p.data?.presets) {
      setPresets(p.data.presets as PresetRow[]);
    }
    if (b.success && b.data) {
      setActiveOverlay(b.data.activeOverlay);
    }
    if (a.success && a.data?.alerts) {
      setAlerts(
        a.data.alerts.map(row => ({
          id: row.id,
          kind: row.kind,
          occurredAt: row.occurredAt,
        }))
      );
    }
  }, [broadcast.id, eventId]);

  useEffect(() => {
    void loadFinishB();
  }, [loadFinishB]);

  const run = useCallback(
    async (label: string, fn: () => Promise<void>) => {
      setBusy(true);
      setMessage(null);
      try {
        await fn();
        setMessage(label);
        await onRefresh();
        await loadFinishB();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "failed");
      } finally {
        setBusy(false);
      }
    },
    [loadFinishB, onRefresh]
  );

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="text-sm font-semibold">Advanced Studio (B1)</h2>
      <p className="text-muted-foreground text-xs">
        Preparation stays at 1× credits until you activate. Programme changes
        enqueue compositor worker jobs (mock until R2-10 real output is proved).
      </p>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <dt className="text-muted-foreground">Prep</dt>
        <dd>{broadcast.advancedPrepStatus ?? "none"}</dd>
        <dt className="text-muted-foreground">Rate</dt>
        <dd>{broadcast.consumptionRate ?? "standard"}</dd>
        <dt className="text-muted-foreground">Programme v</dt>
        <dd>{broadcast.programmeVersion ?? 0}</dd>
      </dl>

      <HostStreamBrandingPreview activeOverlay={activeOverlay} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-md border px-3 py-1.5 text-xs"
          onClick={() =>
            run("Advanced preparation started", async () => {
              unwrap(
                await prepareAdvancedStudioAction(eventId, broadcast.id, {
                  preferHostSession: true,
                })
              );
            })
          }
        >
          Set up Advanced
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border px-3 py-1.5 text-xs"
          onClick={() =>
            run("Director lease acquired", async () => {
              unwrap(
                await acquireDirectorLeaseAction(
                  eventId,
                  broadcast.id,
                  deviceId,
                  { preferHostSession: true }
                )
              );
            })
          }
        >
          Claim director
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border px-3 py-1.5 text-xs"
          onClick={() =>
            run("Invite created — share token with second device", async () => {
              const inv = unwrap(
                await createContributorInviteAction(eventId, broadcast.id, {
                  preferHostSession: true,
                })
              );
              setInviteToken(inv.inviteToken);
            })
          }
        >
          Create invite
        </button>
        {inviteToken ? (
          <p
            className="text-muted-foreground break-all font-mono text-[10px]"
            data-testid="advanced-contributor-invite-token"
          >
            Invite token (copy to contributor device): {inviteToken}
          </p>
        ) : null}
        <input
          type="text"
          className="w-full rounded-md border px-2 py-1 text-xs"
          placeholder="Paste invite token from host device"
          data-testid="contributor-invite-paste"
          value={pastedInviteToken}
          onChange={e => setPastedInviteToken(e.target.value)}
        />
        {(inviteToken || pastedInviteToken.trim()) ? (
          <button
            type="button"
            disabled={busy}
            className="rounded-md border px-3 py-1.5 text-xs"
            onClick={() =>
              run("Contributor preview session (mock)", async () => {
                const token = pastedInviteToken.trim() || inviteToken;
                if (!token) throw new Error("invite_token_required");
                unwrap(
                  await redeemContributorInviteAction(
                    eventId,
                    broadcast.id,
                    {
                      inviteToken: token,
                      deviceSessionId: `${deviceId}-contrib`,
                    },
                    { preferHostSession: true }
                  )
                );
              })
            }
          >
            Redeem invite (this browser)
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
          onClick={() =>
            run("Advanced activated — 2× rate", async () => {
              unwrap(
                await activateAdvancedStudioAction(eventId, broadcast.id, {
                  deviceSessionId: deviceId,
                  idempotencyKey: crypto.randomUUID(),
                })
              );
            })
          }
        >
          Activate Advanced
        </button>
        {broadcast.advancedPrepStatus === "active" ? (
          <>
            <button
              type="button"
              disabled={busy}
              className="rounded-md border px-3 py-1.5 text-xs"
              onClick={() =>
                run("Programme: camera A", async () => {
                  unwrap(
                    await patchAdvancedProgrammeAction(
                      eventId,
                      broadcast.id,
                      {
                        expectedVersion: broadcast.programmeVersion ?? 0,
                        layout: "camera_a",
                        mainAudioSource: "camera_a",
                      },
                      { preferHostSession: true }
                    )
                  );
                })
              }
            >
              Camera A
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-md border px-3 py-1.5 text-xs"
              onClick={() =>
                run("Programme: split", async () => {
                  unwrap(
                    await patchAdvancedProgrammeAction(
                      eventId,
                      broadcast.id,
                      {
                        expectedVersion: broadcast.programmeVersion ?? 0,
                        layout: "split",
                      },
                      { preferHostSession: true }
                    )
                  );
                })
              }
            >
              Split view
            </button>
          </>
        ) : null}
        <button
          type="button"
          disabled={busy}
          className="rounded-md border px-3 py-1.5 text-xs"
          onClick={() =>
            run("Returned to Standard", async () => {
              unwrap(
                await downgradeAdvancedStudioAction(eventId, broadcast.id, {
                  preferHostSession: true,
                })
              );
            })
          }
        >
          Return to Standard
        </button>
      </div>

      {presets.length > 0 ? (
        <div className="space-y-2 border-t pt-3">
          <h3 className="text-xs font-semibold">Assisted presets (Finish B)</h3>
          <ul className="space-y-2">
            {presets.map(preset => (
              <li
                key={preset.presetId}
                className="flex flex-wrap items-center gap-2 text-xs"
              >
                <span className="min-w-[10rem]">
                  {PRESET_LABELS[preset.presetId]}
                </span>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={preset.enabled}
                    disabled={busy}
                    onChange={() =>
                      run("Preset updated", async () => {
                        unwrap(
                          await patchAssistedPresetAction(
                            eventId,
                            broadcast.id,
                            {
                              presetId: preset.presetId,
                              enabled: !preset.enabled,
                            },
                            { preferHostSession: true }
                          )
                        );
                      })
                    }
                  />
                  Enabled
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={preset.manualOverride}
                    disabled={busy}
                    onChange={() =>
                      run("Preset override updated", async () => {
                        unwrap(
                          await patchAssistedPresetAction(
                            eventId,
                            broadcast.id,
                            {
                              presetId: preset.presetId,
                              manualOverride: !preset.manualOverride,
                            },
                            { preferHostSession: true }
                          )
                        );
                      })
                    }
                  />
                  Manual override
                </label>
                <button
                  type="button"
                  disabled={busy || broadcast.advancedPrepStatus !== "active"}
                  className="rounded border px-2 py-0.5"
                  onClick={() =>
                    run(`Applied ${PRESET_LABELS[preset.presetId]}`, async () => {
                      unwrap(
                        await applyAssistedPresetAction(
                          eventId,
                          broadcast.id,
                          preset.presetId,
                          { preferHostSession: true }
                        )
                      );
                    })
                  }
                >
                  Apply now
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {alerts.length > 0 ? (
        <div className="space-y-1 border-t pt-3">
          <h3 className="text-xs font-semibold">Interaction alerts</h3>
          <ul className="text-muted-foreground max-h-24 overflow-y-auto text-xs">
            {alerts.slice(0, 8).map(a => (
              <li key={a.id}>
                {a.kind} · {new Date(a.occurredAt).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {message ? (
        <p className="text-muted-foreground text-xs" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}

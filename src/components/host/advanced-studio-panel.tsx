"use client";

import { useCallback, useState } from "react";

import {
  acquireDirectorLeaseAction,
  activateAdvancedStudioAction,
  createContributorInviteAction,
  downgradeAdvancedStudioAction,
  prepareAdvancedStudioAction,
  redeemContributorInviteAction,
} from "@/actions/event-advanced-studio";
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

function unwrap<T>(res: ActionResult<T>): T {
  if (!res.success) throw new Error(res.error ?? "action_failed");
  return res.data as T;
}

/**
 * B1 Advanced Studio owner controls (LIVE-011–012).
 * Flag-gated on API; mock contributor join until Exp-05 / real Daily authorised.
 */
export function AdvancedStudioPanel({ eventId, broadcast, onRefresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const deviceId = getNativeBroadcastDeviceSessionId();

  const run = useCallback(
    async (label: string, fn: () => Promise<void>) => {
      setBusy(true);
      setMessage(null);
      try {
        await fn();
        setMessage(label);
        await onRefresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "failed");
      } finally {
        setBusy(false);
      }
    },
    [onRefresh]
  );

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="text-sm font-semibold">Advanced Studio (B1)</h2>
      <p className="text-muted-foreground text-xs">
        Preparation stays at 1× credits until you activate. Second device joins
        preview only (mock contract until provider gate).
      </p>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <dt className="text-muted-foreground">Prep</dt>
        <dd>{broadcast.advancedPrepStatus ?? "none"}</dd>
        <dt className="text-muted-foreground">Rate</dt>
        <dd>{broadcast.consumptionRate ?? "standard"}</dd>
      </dl>
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
          <button
            type="button"
            disabled={busy}
            className="rounded-md border px-3 py-1.5 text-xs"
            onClick={() =>
              run("Contributor preview session (mock)", async () => {
                unwrap(
                  await redeemContributorInviteAction(eventId, broadcast.id, {
                    inviteToken,
                    deviceSessionId: `${deviceId}-contrib`,
                  })
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
      {message ? (
        <p className="text-muted-foreground text-xs" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}

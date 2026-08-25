/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";

import {
  getHostAnimationLibraryAction,
  initHostTipConfigAction,
  loadHostTipConfigAction,
  publishHostTipConfigAction,
  resetHostTipConfigAction,
  saveHostTipConfigDraftAction,
  submitPremiumAnimationRequestAction,
} from "@/actions/tip-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TipConfigPayload } from "@/lib/tip-config-types";
import { hasActiveHostSession } from "@/lib/host-session-client";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import { HostSubscriptionPricingPanel } from "@/components/dashboard/host-subscription-pricing-panel";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export default function TipCustomizationClient({
  hostSlug,
  eventId,
}: {
  hostSlug: string;
  eventId: string;
}) {
  const hostSessionActive = hasActiveHostSession();
  const { capabilities, isLoading: planLoading } = useHostPlanCapabilities();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [draft, setDraft] = useState<TipConfigPayload | null>(null);
  const [library, setLibrary] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await loadHostTipConfigAction(eventId);
      if (!res.success || !res.data) {
        throw new Error(res.message ?? "Failed to load");
      }
      const j = res.data;
      setInitialized(Boolean(j.initialized));
      setFrozen(Boolean(j.frozen));
      if (j.draft) setDraft(j.draft as TipConfigPayload);
      else if (j.active?.config) setDraft(j.active.config as TipConfigPayload);
      else setDraft(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!hostSessionActive) return;
    void load();
  }, [load, hostSessionActive]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await getHostAnimationLibraryAction({ library: "premium" });
        if (res.success && res.data && Array.isArray(res.data.items)) {
          setLibrary(res.data.items);
        }
      } catch {
        /* ignore */
      }
    };
    if (hostSessionActive) void run();
  }, [hostSessionActive]);

  const init = async () => {
    setSaving(true);
    try {
      const res = await initHostTipConfigAction(eventId);
      if (!res.success) throw new Error(res.message ?? "Init failed");
      toast.success("Tip customization initialized");
      setInitialized(true);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Init failed");
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async (payload: TipConfigPayload): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await saveHostTipConfigDraftAction(eventId, payload);
      if (!res.success) throw new Error(res.message ?? "Save failed");
      toast.success("Draft saved");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!draft) return;
    const saved = await saveDraft(draft);
    if (!saved) return;
    setSaving(true);
    try {
      const res = await publishHostTipConfigAction(eventId);
      if (!res.success) throw new Error(res.message ?? "Publish failed");
      toast.success(
        res.data?.reviewNeeded
          ? "Published (flagged for review)"
          : "Published live"
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      const res = await resetHostTipConfigAction(eventId);
      if (!res.success) throw new Error(res.message ?? "Reset failed");
      if (res.data?.config) setDraft(res.data.config as TipConfigPayload);
      toast.success("Draft reset from your event’s catalog layout");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setSaving(false);
    }
  };

  const [reqDesc, setReqDesc] = useState("");
  const [reqUrls, setReqUrls] = useState("");

  const submitPremiumRequest = async () => {
    if (!reqDesc.trim()) {
      toast.error("Describe the animation");
      return;
    }
    setSaving(true);
    try {
      const urls = reqUrls
        .split(/[\s,]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 5);
      const res = await submitPremiumAnimationRequestAction({
        eventId,
        description: reqDesc.trim().slice(0, 2000),
        inspirationUrls: urls.length ? urls : undefined,
      });
      if (!res.success) throw new Error(res.message ?? "Request failed");
      toast.success("Request submitted");
      setReqDesc("");
      setReqUrls("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  const updatePremiumPrice = (itemId: string, priceGbp: number) => {
    if (!draft) return;
    const minor = Math.round(priceGbp * 100);
    const patch = (items: any[]) =>
      items.map(it =>
        it.itemId === itemId && it.kind === "premium"
          ? { ...it, priceMinor: minor }
          : it
      );
    setDraft({
      ...draft,
      sectionItems: patch(draft.sectionItems),
      drawerItems: patch(draft.drawerItems),
    });
  };

  if (loading || planLoading) {
    return (
      <p className="text-muted-foreground text-sm">
        Loading tip customization…
      </p>
    );
  }

  if (!capabilities.accessTipLayout) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-6">
        <h1 className="text-2xl font-semibold">Tip layout</h1>
        <p className="text-muted-foreground text-sm">
          Active Host Premium or Community subscription required to customize
          tip layout for this event.
        </p>
        <HostSubscriptionPricingPanel focusTier="premium" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Tip section & drawer</h1>
          <p className="text-muted-foreground text-sm">
            Event ID: {eventId} ·{" "}
            <Link
              href={`/host/${hostSlug}/manage-event`}
              className="text-primary underline"
            >
              Back to events
            </Link>
          </p>
        </div>
      </div>

      {frozen && (
        <div className="rounded-md border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Customization is frozen by an administrator. Contact support to
          appeal.
        </div>
      )}

      {!initialized ? (
        <div className="space-y-4 rounded-lg border p-6">
          <p className="text-sm">
            Initialize tip customization to copy your current event tip layout
            into the new editor. Requires Host Premium or Community.
          </p>
          <Button
            disabled={saving || !hostSessionActive || frozen}
            onClick={() => void init()}
          >
            Initialize for this event
          </Button>
        </div>
      ) : !draft ? (
        <p className="text-muted-foreground text-sm">
          No configuration available.
        </p>
      ) : (
        <>
          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Section CTA</Label>
              <Select
                value={draft.ctaSectionLabel}
                onValueChange={value =>
                  setDraft({ ...draft, ctaSectionLabel: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a section CTA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Donate">Donate</SelectItem>
                  <SelectItem value="Engage">Engage</SelectItem>
                  <SelectItem value="Gift">Gift</SelectItem>
                  <SelectItem value="Give">Give</SelectItem>
                  <SelectItem value="Play">Play</SelectItem>
                  <SelectItem value="Support">Support</SelectItem>
                  <SelectItem value="Tip">Tip</SelectItem>
                  <SelectItem value="Tip or Donate">Tip or Donate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pay button label</Label>
              <Input
                disabled={frozen}
                value={draft.ctaPayLabel}
                onChange={e =>
                  setDraft({ ...draft, ctaPayLabel: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Text tip price (£)</Label>
              <Input
                type="number"
                disabled={frozen}
                step={0.01}
                min={5}
                value={draft.textCharacter.priceMinor / 100}
                onChange={e => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setDraft({
                    ...draft,
                    textCharacter: {
                      ...draft.textCharacter,
                      priceMinor: Math.round(n * 100),
                      priceTouchedByHost: true,
                    },
                  });
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-medium">Premium slot prices</h2>
            <p className="text-muted-foreground text-xs">
              General (default) animations keep catalog prices. Only premium
              rows can be repriced here.
            </p>
            <ul className="space-y-2">
              {[...draft.sectionItems, ...draft.drawerItems]
                .filter(i => i.kind === "premium")
                .map(it => (
                  <li
                    key={it.itemId}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <span className="text-muted-foreground w-40 truncate">
                      {it.characterId.slice(0, 8)}…
                    </span>
                    <Input
                      className="max-w-[120px]"
                      type="number"
                      step={0.01}
                      min={5}
                      max={250}
                      disabled={frozen}
                      value={it.priceMinor / 100}
                      onChange={e => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        updatePremiumPrice(it.itemId, n);
                      }}
                    />
                  </li>
                ))}
            </ul>
            {![...draft.sectionItems, ...draft.drawerItems].some(
              i => i.kind === "premium"
            ) && (
              <p className="text-muted-foreground text-sm">
                No premium animations in this layout yet. Add premium icons from
                the library when building your event, or request one below.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={saving || frozen}
              onClick={() => void saveDraft(draft)}
            >
              Save draft
            </Button>
            <Button
              disabled={saving || frozen}
              onClick={() => void publish()}
            >
              Publish live
            </Button>
            <Button
              variant="outline"
              disabled={saving || frozen}
              onClick={() => void reset()}
            >
              Reset draft from catalog
            </Button>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="font-medium">Request a premium animation</h2>
            <Textarea
              placeholder="Describe motion, colors, occasion…"
              value={reqDesc}
              onChange={e => setReqDesc(e.target.value)}
            />
            <Input
              placeholder="Reference URLs (comma or space separated)"
              value={reqUrls}
              onChange={e => setReqUrls(e.target.value)}
            />
            <Button
              disabled={saving || frozen}
              onClick={() => void submitPremiumRequest()}
            >
              Submit request
            </Button>
            {library.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Premium catalog preview: {library.length} characters available
                to place after publishing overrides in the main event editor.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

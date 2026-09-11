/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { TipSection } from "@/components/events/tip-section";
import { buildTipPresentation } from "@/lib/merge-tip-config";
import {
  buildFallbackDrawerSetsFromCharacters,
  resolveTipDrawerSets,
} from "@/lib/resolve-tip-drawer-sets";
import {
  buildTipCharacterMap,
  libraryItemsToRoomCharacters,
  resolveCharacterFromMap,
} from "@/lib/tip-character-map";
import { getEventCharacterCatalogAction } from "@/actions/events";
import { parseEventCharacterCatalog } from "@/lib/parse-event-character-catalog";
import type { AnimationLibraryItem } from "@/actions/tip-config";
import type { RoomCharacter } from "@/types";
import Image from "next/image";

export default function TipCustomizationClient({
  hostSlug,
  eventId,
}: {
  hostSlug: string;
  eventId: string;
}) {
  const hostSessionActive = hasActiveHostSession();
  const { capabilities, isLoading: planLoading } = useHostPlanCapabilities();
  const { handleSubscriptionActionError, SubscriptionPromptModal } =
    useHostSubscriptionPrompt({ focusTier: "premium" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [draft, setDraft] = useState<TipConfigPayload | null>(null);
  const [publishedConfig, setPublishedConfig] =
    useState<TipConfigPayload | null>(null);
  const [library, setLibrary] = useState<any[]>([]);
  const [eliteLibrary, setEliteLibrary] = useState<AnimationLibraryItem[]>([]);
  const [eventCatalogChars, setEventCatalogChars] = useState<RoomCharacter[]>(
    []
  );
  const [eventCatalogSets, setEventCatalogSets] = useState<any[]>([]);
  const [eliteLibraryError, setEliteLibraryError] = useState<string | null>(
    null
  );
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  const characterMap = useMemo(
    () =>
      buildTipCharacterMap(
        libraryItemsToRoomCharacters([...library, ...eliteLibrary]),
        eventCatalogChars
      ),
    [library, eliteLibrary, eventCatalogChars]
  );

  const buildCatalogFromConfig = useCallback(
    (config: TipConfigPayload): RoomCharacter[] => {
      const ids = new Set<string>();
      const rows: RoomCharacter[] = [];
      for (const it of [...config.sectionItems, ...config.drawerItems]) {
        if (ids.has(it.characterId)) continue;
        const resolved = resolveCharacterFromMap(
          characterMap,
          it.characterId,
          it.priceMinor
        );
        if (resolved) {
          ids.add(it.characterId);
          rows.push(resolved);
        }
      }
      for (const id of config.eliteCharacterIds ?? []) {
        if (ids.has(id)) continue;
        const resolved = resolveCharacterFromMap(characterMap, id);
        if (resolved) {
          ids.add(id);
          rows.push(resolved);
        }
      }
      return rows;
    },
    [characterMap]
  );

  const buildEliteStubs = useCallback(
    (config: TipConfigPayload): RoomCharacter[] =>
      libraryItemsToRoomCharacters(
        eliteLibrary.filter(item =>
          (config.eliteCharacterIds ?? []).includes(item.id)
        )
      ),
    [eliteLibrary]
  );

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
      if (j.active?.config) {
        setPublishedConfig(j.active.config as TipConfigPayload);
      } else {
        setPublishedConfig(null);
      }
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
      setEliteLibraryError(null);
      try {
        const [premiumRes, eliteRes, generalRes, eventCatRes] =
          await Promise.all([
            getHostAnimationLibraryAction({ library: "premium", limit: 80 }),
            getHostAnimationLibraryAction({ library: "elite", limit: 80 }),
            getHostAnimationLibraryAction({ library: "general", limit: 80 }),
            getEventCharacterCatalogAction(eventId),
          ]);
        const premiumItems =
          premiumRes.success && Array.isArray(premiumRes.data?.items)
            ? premiumRes.data.items
            : [];
        const generalItems =
          generalRes.success && Array.isArray(generalRes.data?.items)
            ? generalRes.data.items
            : [];
        setLibrary([...generalItems, ...premiumItems]);
        if (
          eliteRes.success &&
          eliteRes.data &&
          Array.isArray(eliteRes.data.items)
        ) {
          setEliteLibrary(eliteRes.data.items);
        } else if (!eliteRes.success) {
          setEliteLibraryError(
            eliteRes.message ?? "Could not load elite animation library"
          );
        }
        if (eventCatRes.success && eventCatRes.data) {
          const parsed = parseEventCharacterCatalog(
            eventCatRes.data.characterSets ?? []
          );
          setEventCatalogChars(parsed.tippingCharacters);
          setEventCatalogSets(parsed.characterSets);
        }
      } catch (e) {
        setEliteLibraryError(
          e instanceof Error ? e.message : "Could not load animation libraries"
        );
      }
    };
    if (hostSessionActive) void run();
  }, [hostSessionActive, eventId]);

  const init = async () => {
    setSaving(true);
    try {
      const res = await initHostTipConfigAction(eventId);
      if (!res.success) {
        if (handleSubscriptionActionError(res)) return;
        toast.error(res.message ?? "Init failed");
        return;
      }
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
      if (!res.success) {
        if (handleSubscriptionActionError(res)) return false;
        toast.error(res.message ?? "Save failed");
        return false;
      }
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
      if (!res.success) {
        if (handleSubscriptionActionError(res)) return;
        toast.error(res.message ?? "Publish failed");
        return;
      }
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
      if (!res.success) {
        if (handleSubscriptionActionError(res)) return;
        toast.error(res.message ?? "Reset failed");
        return;
      }
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

  const toggleEliteCharacter = (characterId: string) => {
    if (!draft) return;
    const current = draft.eliteCharacterIds ?? [];
    const has = current.includes(characterId);
    const next = has
      ? current.filter(id => id !== characterId)
      : current.length >= 10
        ? current
        : [...current, characterId];
    if (!has && current.length >= 10) {
      toast.error("Maximum 10 elite animations");
      return;
    }
    setDraft({ ...draft, eliteCharacterIds: next });
  };

  const previewPresentation = useMemo(() => {
    if (!draft) return null;
    const baseChars = buildCatalogFromConfig(draft);
    const eliteStubs = buildEliteStubs(draft);
    return buildTipPresentation(baseChars, draft, 1, eliteStubs);
  }, [draft, previewRefreshKey, buildCatalogFromConfig, buildEliteStubs]);

  const livePresentation = useMemo(() => {
    if (!publishedConfig) return null;
    const baseChars = buildCatalogFromConfig(publishedConfig);
    const eliteStubs = buildEliteStubs(publishedConfig);
    return buildTipPresentation(baseChars, publishedConfig, 1, eliteStubs);
  }, [publishedConfig, buildCatalogFromConfig, buildEliteStubs]);

  const liveDrawerSets = useMemo(() => {
    if (!livePresentation) return [];
    const catalogSets =
      eventCatalogSets.length > 0
        ? eventCatalogSets
        : buildFallbackDrawerSetsFromCharacters(livePresentation.allEnriched);
    return resolveTipDrawerSets(
      catalogSets,
      livePresentation.allEnriched,
      buildFallbackDrawerSetsFromCharacters(livePresentation.allEnriched)
    );
  }, [eventCatalogSets, livePresentation]);

  const previewDrawerSets = useMemo(() => {
    if (!previewPresentation) return [];
    const catalogSets =
      eventCatalogSets.length > 0
        ? eventCatalogSets
        : buildFallbackDrawerSetsFromCharacters(
            previewPresentation.allEnriched
          );
    return resolveTipDrawerSets(
      catalogSets,
      previewPresentation.allEnriched,
      buildFallbackDrawerSetsFromCharacters(previewPresentation.allEnriched)
    );
  }, [eventCatalogSets, previewPresentation]);

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
      {SubscriptionPromptModal}
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
                    <span className="text-muted-foreground flex w-40 items-center gap-2 truncate">
                      {characterMap.get(it.characterId)?.iconUrl ? (
                        <Image
                          src={characterMap.get(it.characterId)!.iconUrl}
                          alt=""
                          width={24}
                          height={24}
                          className="size-6 shrink-0 object-contain"
                        />
                      ) : null}
                      {characterMap.get(it.characterId)?.name ??
                        `${it.characterId.slice(0, 8)}…`}
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

          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="font-medium">Elite (Growth)</h2>
            <p className="text-muted-foreground text-xs">
              Select up to 10 elite animations. They appear in their own drawer
              tab and are prioritized in the tip strip.
            </p>
            {eliteLibraryError ? (
              <p className="text-sm text-red-600">{eliteLibraryError}</p>
            ) : null}
            {eliteLibrary.length === 0 && !eliteLibraryError ? (
              <p className="text-muted-foreground text-sm">
                No elite animations in the marketplace yet. Ask an admin to add
                characters to the Elite set.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2">Select</th>
                      <th className="px-3 py-2">Icon</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Style</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eliteLibrary.map(item => (
                      <tr
                        key={item.id}
                        className="border-t"
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            disabled={frozen}
                            checked={(draft.eliteCharacterIds ?? []).includes(
                              item.id
                            )}
                            onChange={() => toggleEliteCharacter(item.id)}
                            aria-label={`Select ${item.name}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Image
                            src={item.iconUrl}
                            alt=""
                            width={32}
                            height={32}
                            className="size-8 object-contain"
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">{item.name}</td>
                        <td className="px-3 py-2">£{item.price}</td>
                        <td className="text-muted-foreground px-3 py-2">
                          {item.styleName ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {livePresentation && previewPresentation ? (
            <div className="space-y-3 rounded-lg border p-4">
              <h2 className="font-medium">Before / after</h2>
              <p className="text-muted-foreground text-xs">
                Compare your published live layout with the current draft.
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Live (published)</p>
                  <div className="rounded-md border bg-white p-2">
                    <TipSection
                      eventId={eventId}
                      tippingCharacters={livePresentation.sectionStrip}
                      characterSets={liveDrawerSets}
                      paymentSurface="event_room"
                      sectionCtaLabel={publishedConfig?.ctaSectionLabel}
                      payLabel={publishedConfig?.ctaPayLabel}
                      previewMode
                      preserveStripOrder
                      eliteCharacterIds={publishedConfig?.eliteCharacterIds}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Draft</p>
                  <div className="rounded-md border bg-white p-2">
                    <TipSection
                      eventId={eventId}
                      tippingCharacters={previewPresentation.sectionStrip}
                      characterSets={previewDrawerSets}
                      paymentSurface="event_room"
                      sectionCtaLabel={draft.ctaSectionLabel}
                      payLabel={draft.ctaPayLabel}
                      previewMode
                      preserveStripOrder
                      eliteCharacterIds={draft.eliteCharacterIds}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {previewPresentation ? (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-medium">Preview studio (no Stripe)</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewRefreshKey(k => k + 1)}
                >
                  Refresh strip shuffle
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Dummy preview of your draft layout. Publish to update live
                playback.
              </p>
              <div className="rounded-md border bg-white p-2">
                <TipSection
                  key={`preview-${previewRefreshKey}`}
                  eventId={eventId}
                  tippingCharacters={previewPresentation.sectionStrip}
                  characterSets={previewDrawerSets}
                  paymentSurface="event_room"
                  sectionCtaLabel={draft.ctaSectionLabel}
                  payLabel={draft.ctaPayLabel}
                  previewMode
                  eliteCharacterIds={draft.eliteCharacterIds}
                />
              </div>
            </div>
          ) : null}

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

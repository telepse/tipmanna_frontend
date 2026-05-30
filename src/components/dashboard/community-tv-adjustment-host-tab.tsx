"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import type { RootState } from "@/redux/store";
import { EVENT_VIDEO_TYPE_OPTIONS } from "@/lib/event-video-type-options";

type Half = "FIRST_HALF" | "SECOND_HALF";

type SubRes = { id: string; half: Half; taxonomyKeys: string[] };
type ColRes = {
  id: string;
  slotOrder: number;
  title: string;
  subsections: SubRes[];
};

type ConfigRes = {
  configId: string;
  configVersion?: number;
  enabled: boolean;
  effectiveFromWindowIndex: number | null;
  activeCollectionIndex: number;
  currentWallWindowIndex: number;
  collections: ColRes[];
};

function keysFor(c: ColRes, half: Half): string[] {
  return c.subsections.find(s => s.half === half)?.taxonomyKeys ?? [];
}

export function CommunityTvAdjustmentHostTab({
  communityId,
  apiBase,
}: {
  communityId: string;
  apiBase: string;
}) {
  const authToken = useSelector((s: RootState) => s.auth.token);
  const [cfg, setCfg] = useState<ConfigRes | null>(null);
  const [collections, setCollections] = useState<ColRes[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const base = apiBase.replace(/\/$/, "");
  const prefix = `${base}/communities/${encodeURIComponent(communityId)}/tv/adjustment-config`;

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = authToken;
      if (!token) throw new Error("Sign in as the community owner.");
      const res = await fetch(prefix, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        throw new Error("Only the community owner can manage TV themes.");
      }
      if (!res.ok) throw new Error(`Could not load themes (${res.status})`);
      const data = (await res.json()) as ConfigRes;
      setCfg(data);
      setCollections(
        [...data.collections].sort((a, b) => a.slotOrder - b.slotOrder)
      );
      setEnabled(data.enabled);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setError(msg);
      setCfg(null);
    } finally {
      setLoading(false);
    }
  }, [prefix]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleKey = (colId: string, half: Half, key: string, on: boolean) => {
    setCollections(prev =>
      prev.map(c => {
        if (c.id !== colId) return c;
        const subs = c.subsections.map(s => {
          if (s.half !== half) return s;
          const set = new Set(s.taxonomyKeys);
          if (on) set.add(key);
          else set.delete(key);
          return { ...s, taxonomyKeys: [...set] };
        });
        return { ...c, subsections: subs };
      })
    );
  };

  const persist = async () => {
    setError(null);
    setLoading(true);
    try {
      const token = authToken;
      if (!token) throw new Error("Sign in as the community owner.");
      const body = {
        enabled,
        activeCollectionIndex: cfg?.activeCollectionIndex ?? 0,
        collections: [...collections]
          .sort((a, b) => a.slotOrder - b.slotOrder)
          .map(c => ({
            slotOrder: c.slotOrder,
            title: c.title,
            subsections: (["FIRST_HALF", "SECOND_HALF"] as const).map(half => ({
              half,
              taxonomyKeys: keysFor(c, half),
            })),
          })),
      };
      const res = await fetch(prefix, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      toast.success("TV themes saved");
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (
      !window.confirm(
        "Reset TV themes to defaults? This clears your chip selections."
      )
    ) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const token = authToken;
      if (!token) throw new Error("Sign in as the community owner.");
      const res = await fetch(`${prefix}/reset`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Reset failed (${res.status})`);
      toast.success("TV themes reset");
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Reset failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const quickToggle = async (on: boolean) => {
    setError(null);
    setLoading(true);
    try {
      const token = authToken;
      if (!token) throw new Error("Sign in as the community owner.");
      const res = await fetch(`${prefix}/enabled`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: on }),
      });
      if (!res.ok) throw new Error(`Toggle failed (${res.status})`);
      toast.success(on ? "Themed scheduling enabled" : "Themed scheduling off");
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Toggle failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !cfg) {
    return (
      <p className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading TV themes…
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-muted-foreground text-sm">
        Boost selected video categories in the first and second halves of each
        12-hour TV window. Changes apply from the{" "}
        <strong className="text-foreground">next 12-hour window</strong> after
        you save (viewers already on air keep the current window).
      </p>

      {error ? (
        <p
          className="text-destructive text-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {cfg ? (
        <div className="bg-card space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Themed scheduling</span>
              <Switch
                checked={enabled}
                onCheckedChange={v => void quickToggle(v)}
                disabled={loading}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Current wall window: <strong>{cfg.currentWallWindowIndex}</strong>
              {" · "}
              Effective from window:{" "}
              <strong>{cfg.effectiveFromWindowIndex ?? "—"}</strong>
            </p>
          </div>

          {collections.map(col => (
            <div
              key={col.id}
              className="border-input space-y-3 rounded-md border p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="max-w-xs"
                  value={col.title}
                  onChange={e =>
                    setCollections(prev =>
                      prev.map(c =>
                        c.id === col.id ? { ...c, title: e.target.value } : c
                      )
                    )
                  }
                  aria-label={`Collection ${col.slotOrder} title`}
                />
                <span className="text-muted-foreground text-xs">
                  slot {col.slotOrder}
                </span>
              </div>
              {(["FIRST_HALF", "SECOND_HALF"] as Half[]).map(half => (
                <div key={half}>
                  <p className="mb-1 text-xs font-semibold tracking-wide uppercase">
                    {half.replace("_", " ")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_VIDEO_TYPE_OPTIONS.map(opt => {
                      const sel = keysFor(col, half).includes(opt.value);
                      return (
                        <label
                          key={`${col.id}-${half}-${opt.value}`}
                          className="bg-muted/40 flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs"
                        >
                          <Checkbox
                            checked={sel}
                            onCheckedChange={v =>
                              toggleKey(col.id, half, opt.value, Boolean(v))
                            }
                          />
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void persist()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Save chip sets"
              )}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={loading}
              onClick={() => void reset()}
            >
              Reset to defaults
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void load()}
            >
              Reload
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

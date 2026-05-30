"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";

import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RootState } from "@/redux/store";

export function CommunityCustomizationHostClient({
  hostSlug,
}: {
  hostSlug: string;
}) {
  const authToken = useSelector((s: RootState) => s.auth.token);
  const searchParams = useSearchParams();
  const communityId = searchParams.get("communityId")?.trim() ?? "";
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";

  const [headerColor, setHeaderColor] = useState("#1e293b");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [tvLogoUrl, setTvLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!communityId) return;
    const r = await fetch(
      `${base}/communities/${encodeURIComponent(communityId)}/customization`
    );
    if (!r.ok) return;
    const d = (await r.json()) as {
      customization: {
        headerColor: string | null;
        brandColor: string | null;
        tvLogoUrl: string | null;
      } | null;
    };
    const c = d.customization;
    if (c?.headerColor) setHeaderColor(c.headerColor);
    if (c?.brandColor) setBrandColor(c.brandColor);
    if (c?.tvLogoUrl) setTvLogoUrl(c.tvLogoUrl);
  }, [base, communityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    if (!communityId) return;
    const t = authToken;
    if (!t) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(
        `${base}/communities/${encodeURIComponent(communityId)}/customization`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify({
            headerColor: headerColor || null,
            brandColor: brandColor || null,
            tvLogoUrl: tvLogoUrl.trim() || "",
          }),
        }
      );
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setMsg("Saved. Tippers in dedicated mode will see updates live.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [base, communityId, headerColor, brandColor, tvLogoUrl, authToken]);

  const backHref = `/host/${hostSlug}/host-community`;

  if (!communityId) {
    return (
      <>
        <DashboardHeading
          title="Community branding"
          subtitle="Select a community from Community management."
        />
        <Button
          asChild
          variant="outline"
        >
          <Link href={backHref}>Back</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <DashboardHeading
        title="Community branding"
        subtitle="Header and TV logo for tipper dedicated mode (side-chick)."
      />
      <Button
        asChild
        variant="outline"
        size="sm"
        className="mt-2"
      >
        <Link href={backHref}>Back</Link>
      </Button>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hc">Header color (hex)</Label>
            <div className="flex gap-2">
              <Input
                id="hc"
                value={headerColor}
                onChange={e => setHeaderColor(e.target.value)}
                placeholder="#1e293b"
              />
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded border"
                value={
                  /^#[0-9A-Fa-f]{6}$/.test(headerColor)
                    ? headerColor
                    : "#1e293b"
                }
                onChange={e => setHeaderColor(e.target.value)}
                aria-label="Pick header color"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bc">Accent / brand color (hex)</Label>
            <div className="flex gap-2">
              <Input
                id="bc"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                placeholder="#6366f1"
              />
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded border"
                value={
                  /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : "#6366f1"
                }
                onChange={e => setBrandColor(e.target.value)}
                aria-label="Pick brand color"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tvlogo">TV logo URL</Label>
            <Input
              id="tvlogo"
              value={tvLogoUrl}
              onChange={e => setTvLogoUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void save()}
          >
            Save
          </Button>
          {msg ? <p className="text-muted-foreground text-sm">{msg}</p> : null}
        </div>

        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Live preview
          </p>
          <div
            className="rounded-lg border shadow-sm"
            style={{ borderColor: brandColor }}
          >
            <div
              className="flex items-center justify-between px-3 py-2 text-sm text-white"
              style={{ backgroundColor: headerColor }}
            >
              <span className="font-medium">Preview navbar</span>
              <span className="opacity-80">···</span>
            </div>
            <div className="space-y-2 bg-zinc-950 p-4 text-white">
              <p className="text-xs text-zinc-400">TV progress corner</p>
              <div className="flex items-end gap-2">
                {tvLogoUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tvLogoUrl.trim()}
                    alt=""
                    className="size-10 object-contain"
                  />
                ) : (
                  <div className="size-10 rounded bg-zinc-800" />
                )}
                <div className="h-2 flex-1 rounded bg-zinc-800">
                  <div
                    className="h-2 w-1/2 rounded"
                    style={{ backgroundColor: brandColor }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

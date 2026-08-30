"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  getCommunityAnalyticsSummaryAction,
  getCommunityAnalyticsVideoRollupsAction,
} from "@/actions/community-host-dashboard";
import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AnalyticsSummary = {
  dateRange?: { from: string; to: string };
  communityId?: string;
  paymentSurfaceBreakdown?: { surface: string | null; count: number }[];
  deviceBreakdown?: { device: string | null; count: number }[];
  watchSecondsBySurface?: Record<string, number>;
  engagement?: {
    shareClicks: number;
    saves: number;
    likes: number;
    skips: number;
  };
};

type VideoRollupRow = {
  videoId: string;
  videoTitle?: string;
  videoDurationSeconds?: number | null;
  totalNumberOfViews?: number;
  totalDuration?: number;
  totalNumberOfPayments?: number;
  totalEncounters?: number;
  saves?: number;
  comments?: number;
  shares?: number;
  completedViews?: number;
  totalUserInteraction?: number;
};

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isSummary(x: unknown): x is AnalyticsSummary {
  return Boolean(x) && typeof x === "object";
}

function isRollupArray(x: unknown): x is VideoRollupRow[] {
  return Array.isArray(x);
}

function extractRollups(raw: unknown): VideoRollupRow[] {
  if (isRollupArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const k of ["rollups", "data", "items"]) {
      const v = o[k];
      if (isRollupArray(v)) return v;
    }
  }
  return [];
}

function extractSummary(raw: unknown): AnalyticsSummary | null {
  if (isSummary(raw)) return raw;
  if (raw && typeof raw === "object" && "summary" in raw) {
    const s = (raw as { summary: unknown }).summary;
    if (isSummary(s)) return s;
  }
  return null;
}

export function CommunityAnalyticsHostClient({
  hostSlug,
}: {
  hostSlug: string;
}) {
  const searchParams = useSearchParams();
  const communityId = searchParams.get("communityId")?.trim() ?? "";

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [rollups, setRollups] = useState<VideoRollupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const backHref = useMemo(
    () => `/host/${hostSlug}/host-community`,
    [hostSlug]
  );

  const load = useCallback(async () => {
    if (!communityId) return;
    setLoading(true);
    setErr(null);
    try {
      const [sRes, rRes] = await Promise.all([
        getCommunityAnalyticsSummaryAction(communityId),
        getCommunityAnalyticsVideoRollupsAction(communityId),
      ]);
      if (!sRes.success) {
        throw new Error(sRes.message ?? sRes.error ?? "Summary failed");
      }
      if (!rRes.success) {
        throw new Error(rRes.message ?? rRes.error ?? "Rollups failed");
      }
      setSummary(extractSummary(sRes.data));
      setRollups(extractRollups(rRes.data));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rangeLabel = summary?.dateRange
    ? `${new Date(summary.dateRange.from).toLocaleDateString()} – ${new Date(
        summary.dateRange.to
      ).toLocaleDateString()}`
    : null;

  if (!communityId) {
    return (
      <>
        <DashboardHeading
          title="Community analytics"
          subtitle="Open from Community management with a community selected."
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
        title="Community analytics"
        subtitle="Tips and playback attributed to this community (last 30 days by default)."
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
        >
          <Link href={backHref}>Back</Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={() => void load()}
        >
          Refresh
        </Button>
      </div>
      {rangeLabel ? (
        <p className="text-muted-foreground mt-2 text-xs">{rangeLabel}</p>
      ) : null}
      {err ? <p className="text-destructive mt-2 text-sm">{err}</p> : null}
      {loading ? (
        <p className="text-muted-foreground mt-4 text-sm">Loading…</p>
      ) : (
        <div className="mt-6 min-w-0 space-y-8">
          <section className="min-w-0">
            <h2 className="mb-2 text-sm font-semibold">Summary</h2>
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <div className="min-w-0 overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Share clicks</TableCell>
                      <TableCell className="text-right">
                        {summary?.engagement?.shareClicks ?? 0}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Saves</TableCell>
                      <TableCell className="text-right">
                        {summary?.engagement?.saves ?? 0}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Comment likes</TableCell>
                      <TableCell className="text-right">
                        {summary?.engagement?.likes ?? 0}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Skips</TableCell>
                      <TableCell className="text-right">
                        {summary?.engagement?.skips ?? 0}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="min-w-0 space-y-4">
                <div className="overflow-x-auto rounded-md border">
                  <h3 className="border-b px-3 py-2 text-xs font-medium">
                    Watch time by surface (seconds)
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Surface</TableHead>
                        <TableHead className="text-right">Seconds</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(summary?.watchSecondsBySurface ?? {})
                        .length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-muted-foreground"
                          >
                            No watch data in range
                          </TableCell>
                        </TableRow>
                      ) : (
                        Object.entries(
                          summary?.watchSecondsBySurface ?? {}
                        ).map(([surface, sec]) => (
                          <TableRow key={surface}>
                            <TableCell>{surface || "—"}</TableCell>
                            <TableCell className="text-right">
                              {Math.round(sec)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="overflow-x-auto rounded-md border">
                  <h3 className="border-b px-3 py-2 text-xs font-medium">
                    Payments by surface
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Surface</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(summary?.paymentSurfaceBreakdown ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-muted-foreground"
                          >
                            No payments in range
                          </TableCell>
                        </TableRow>
                      ) : (
                        summary!.paymentSurfaceBreakdown!.map((row, i) => (
                          <TableRow key={`${String(row.surface)}-${i}`}>
                            <TableCell>{row.surface ?? "—"}</TableCell>
                            <TableCell className="text-right">
                              {row.count}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="overflow-x-auto rounded-md border">
                  <h3 className="border-b px-3 py-2 text-xs font-medium">
                    Payments by device
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(summary?.deviceBreakdown ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-muted-foreground"
                          >
                            No device data in range
                          </TableCell>
                        </TableRow>
                      ) : (
                        summary!.deviceBreakdown!.map((row, i) => (
                          <TableRow key={`${String(row.device)}-${i}`}>
                            <TableCell>{row.device ?? "—"}</TableCell>
                            <TableCell className="text-right">
                              {row.count}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </section>

          <section className="min-w-0">
            <h2 className="mb-2 text-sm font-semibold">
              Videos (approved bank rollups)
            </h2>
            <div className="w-full overflow-x-auto rounded-md border">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Watch time</TableHead>
                    <TableHead className="text-right">Encounters</TableHead>
                    <TableHead className="text-right">Completes</TableHead>
                    <TableHead className="text-right">Saves</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Comments</TableHead>
                    <TableHead className="text-right">Tips</TableHead>
                    <TableHead className="text-right">Interactions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rollups.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-muted-foreground"
                      >
                        No rollup data for approved videos in this range.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rollups.map(row => (
                      <TableRow key={row.videoId}>
                        <TableCell className="max-w-[200px] truncate">
                          {row.videoTitle?.trim() || row.videoId}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.totalNumberOfViews ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatSeconds(Number(row.totalDuration ?? 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.totalEncounters ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.completedViews ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.saves ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.shares ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.comments ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.totalNumberOfPayments ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.totalUserInteraction ?? 0}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

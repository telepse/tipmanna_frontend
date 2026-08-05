"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { Crown, Loader2 } from "lucide-react";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { DateRange, type Range } from "react-date-range";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  videoEventColumns,
  type VideoAnalyticRow,
} from "@/components/dashboard/video-analytics/columns";
import {
  paymentAnalyticsColumns,
  type PaymentAnalyticsRow,
} from "@/components/dashboard/video-analytics/payment-columns";
import {
  createVideoViewsColumns,
  type VideoRollupRow,
} from "@/components/dashboard/video-analytics/video-columns";
import { useHostID } from "@/hooks/useHostID";
import type { RootState } from "@/redux/store";
import {
  getVideoOverviewPerSurfaceStats,
  HOST_OVERVIEW_SURFACES,
  HOST_SURFACE_EVENT_TABS,
  type VideoOverviewApiRow,
} from "@/lib/video-analytics-utils";

type PaymentMethodRow = {
  surface: string;
  paymentMethod: string;
  count: number;
  amount: number;
};

const emptyOverviewStats = {
  totalWatchDuration: 0,
  totalNumberOfPayments: 0,
  totalNumberOfUsers: 0,
  uniqueVideoCount: 0,
  mobileActors: 0,
  desktopActors: 0,
  shareCount: 0,
  commentCount: 0,
  saveCount: 0,
  encounterCount: 0,
  completeCount: 0,
};

function normalizePaginatedRows<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as { data?: unknown }).data)
  ) {
    return (raw as { data: T[] }).data;
  }
  return [];
}

export type VideoAnalyticsVariant = "reports" | "advanced";

type VideoAnalyticsPanelProps = {
  /** Reports = video views + payment upsell. Advanced = overview + payment table (Host Premium). */
  variant?: VideoAnalyticsVariant;
};

export function VideoAnalyticsPanel({
  variant = "reports",
}: VideoAnalyticsPanelProps) {
  const isReports = variant === "reports";
  const params = useParams();
  const hostSlug = typeof params?.slug === "string" ? params.slug : "";
  const hostId = useHostID();
  const token = useSelector((s: RootState) => s.auth.token);
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";

  const [reportsTab, setReportsTab] = useState<
    "video_views" | "payment_analytics"
  >("video_views");
  const [advancedTab, setAdvancedTab] = useState<
    "overview" | "payment_analytics"
  >("overview");
  const [paymentAnalyticsModalOpen, setPaymentAnalyticsModalOpen] =
    useState(false);
  const [surfaceTab, setSurfaceTab] = useState<string>("tv_looper");
  const [videoSurfaceFilter, setVideoSurfaceFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overviewStats, setOverviewStats] = useState<
    Record<string, ReturnType<typeof getVideoOverviewPerSurfaceStats>>
  >({});
  const [paymentMethodRows, setPaymentMethodRows] = useState<
    PaymentMethodRow[]
  >([]);
  const [videoRollups, setVideoRollups] = useState<VideoRollupRow[]>([]);
  const [paymentRows, setPaymentRows] = useState<PaymentAnalyticsRow[]>([]);
  const [surfaceEvents, setSurfaceEvents] = useState<
    Record<string, VideoAnalyticRow[]>
  >({});

  const [dateRange, setDateRange] = useState<Range[]>([
    {
      startDate: new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      key: "selection",
    },
  ]);

  const { overviewFrom, overviewTo } = useMemo(() => {
    const sel = dateRange[0];
    const s = sel?.startDate;
    const e = sel?.endDate;
    if (!s || !e) {
      return { overviewFrom: undefined, overviewTo: undefined };
    }
    return {
      overviewFrom: s.toISOString().slice(0, 10),
      overviewTo: e.toISOString().slice(0, 10),
    };
  }, [dateRange]);

  const videoViewsColumns = useMemo(
    () =>
      createVideoViewsColumns({
        selectedSurface: videoSurfaceFilter,
        onSelectedSurfaceChange: setVideoSurfaceFilter,
      }),
    [videoSurfaceFilter]
  );

  const fetchHostAnalytics = useCallback(
    async (path: string, params?: Record<string, string>) => {
      if (!hostId || !token) {
        throw new Error("Sign in as host to view analytics.");
      }
      const qs = params ? `?${new URLSearchParams(params)}` : "";
      const res = await fetch(
        `${base}/hosts/${encodeURIComponent(hostId)}/video-analytics/${path}${qs}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      return res.json() as Promise<unknown>;
    },
    [base, hostId, token]
  );

  const loadOverview = useCallback(async () => {
    if (!overviewFrom || !overviewTo) return;

    const statsEntries = await Promise.all(
      HOST_OVERVIEW_SURFACES.map(async surface => {
        const rows = (await fetchHostAnalytics("overview", {
          surface: surface.key,
          from: overviewFrom,
          to: overviewTo,
        })) as VideoOverviewApiRow[];
        return [
          surface.key,
          getVideoOverviewPerSurfaceStats(Array.isArray(rows) ? rows : []),
        ] as const;
      })
    );

    const paymentMethods = (await fetchHostAnalytics("payment-methods", {
      from: overviewFrom,
      to: overviewTo,
    })) as PaymentMethodRow[];

    setOverviewStats(Object.fromEntries(statsEntries));
    setPaymentMethodRows(Array.isArray(paymentMethods) ? paymentMethods : []);
  }, [fetchHostAnalytics, overviewFrom, overviewTo]);

  const loadVideoRollups = useCallback(async () => {
    if (!overviewFrom || !overviewTo) return;
    const rows = (await fetchHostAnalytics("video-rollups", {
      from: overviewFrom,
      to: overviewTo,
    })) as VideoRollupRow[];
    setVideoRollups(Array.isArray(rows) ? rows : []);
  }, [fetchHostAnalytics, overviewFrom, overviewTo]);

  const loadPayments = useCallback(async () => {
    const res = (await fetchHostAnalytics("payments", {
      page: "1",
      limit: "200",
    })) as unknown;
    setPaymentRows(normalizePaginatedRows<PaymentAnalyticsRow>(res));
  }, [fetchHostAnalytics]);

  const loadSurfaceEvents = useCallback(
    async (surface: string) => {
      const res = (await fetchHostAnalytics("surface-events", {
        surface,
        page: "1",
        limit: "200",
      })) as unknown;
      setSurfaceEvents(prev => ({
        ...prev,
        [surface]: normalizePaginatedRows<VideoAnalyticRow>(res),
      }));
    },
    [fetchHostAnalytics]
  );

  const loadAll = useCallback(async () => {
    if (!hostId || !token) {
      setError("Sign in as host to view analytics.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isReports) {
        await loadVideoRollups();
      } else {
        await Promise.all([
          loadOverview(),
          loadPayments(),
          ...HOST_SURFACE_EVENT_TABS.map(tab => loadSurfaceEvents(tab.key)),
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [
    hostId,
    token,
    isReports,
    loadOverview,
    loadVideoRollups,
    loadPayments,
    loadSurfaceEvents,
  ]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const renderOverviewRow = (
    label: string,
    stats: ReturnType<typeof getVideoOverviewPerSurfaceStats>
  ) => (
    <tr
      key={label}
      className="border text-sm font-medium"
    >
      <th
        scope="row"
        className="p-2 text-left"
      >
        {label}
      </th>
      <td>{stats.encounterCount}</td>
      <td>{stats.totalWatchDuration.toFixed(2)}</td>
      <td>{stats.totalNumberOfPayments}</td>
      <td>{stats.totalNumberOfUsers}</td>
      <td>{stats.mobileActors}</td>
      <td>{stats.desktopActors}</td>
      <td>{stats.shareCount}</td>
      <td>{stats.commentCount}</td>
      <td>{stats.saveCount}</td>
      <td>{stats.uniqueVideoCount}</td>
      <td>{stats.completeCount}</td>
    </tr>
  );

  const overviewContent = (
    <>
      <div className="bg-card space-y-4 rounded-md p-6">
        {loading && Object.keys(overviewStats).length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-[900px]">
              <thead>
                <tr className="rounded-t-md border bg-gray-200">
                  <td className="py-3 pr-4 pl-2 text-sm font-medium">
                    Surface
                  </td>
                  <td className="py-3 pr-4 text-sm font-medium">Encounters</td>
                  <td className="py-3 pr-4 text-sm font-medium">
                    Watch duration (s)
                  </td>
                  <td className="py-3 pr-4 text-sm font-medium">Payments</td>
                  <td className="py-3 pr-4 text-sm font-medium">Users</td>
                  <td className="py-3 pr-4 text-sm font-medium">Mobile</td>
                  <td className="py-3 pr-4 text-sm font-medium">Desktop</td>
                  <td className="py-3 pr-4 text-sm font-medium">Shares</td>
                  <td className="py-3 pr-4 text-sm font-medium">Comments</td>
                  <td className="py-3 pr-4 text-sm font-medium">Saved</td>
                  <td className="py-3 pr-4 text-sm font-medium">Views</td>
                  <td className="py-3 pr-4 text-sm font-medium">
                    Completed views
                  </td>
                </tr>
              </thead>
              <tbody>
                {HOST_OVERVIEW_SURFACES.map(surface =>
                  renderOverviewRow(
                    surface.label,
                    overviewStats[surface.key] ?? emptyOverviewStats
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Payment method by surface</h3>
          <div className="overflow-x-auto">
            <table className="min-w-[480px] text-sm">
              <thead>
                <tr className="border bg-gray-200">
                  <th className="p-2 text-left font-medium">Surface</th>
                  <th className="p-2 text-left font-medium">Method</th>
                  <th className="p-2 text-right font-medium">Count</th>
                  <th className="p-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paymentMethodRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-muted-foreground p-2"
                    >
                      No payment data for this range.
                    </td>
                  </tr>
                ) : (
                  paymentMethodRows.map((row, i) => (
                    <tr
                      key={`${row.surface}-${row.paymentMethod}-${i}`}
                      className="border"
                    >
                      <td className="p-2">{row.surface}</td>
                      <td className="p-2 font-mono text-xs">
                        {row.paymentMethod}
                      </td>
                      <td className="p-2 text-right">{row.count}</td>
                      <td className="p-2 text-right">
                        {Number(row.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DateRange
        editableDateInputs
        onChange={item => setDateRange([item.selection])}
        moveRangeOnFirstSelection={false}
        ranges={dateRange}
        months={2}
        direction="horizontal"
        showMonthAndYearPickers
      />
    </>
  );

  const videoViewsContent = (
    <div className="bg-card space-y-4 rounded-md p-6">
      {loading && videoRollups.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={videoViewsColumns}
          data={videoRollups}
        />
      )}
    </div>
  );

  const paymentAnalyticsTable = (
    <div className="bg-card space-y-4 rounded-md p-6">
      <div className="space-y-1">
        <h5 className="text-lg font-medium">Payment analytics</h5>
        <p className="text-muted-foreground text-sm">
          Detailed view of successful tips and payment activity across your
          videos.
        </p>
      </div>
      {loading && paymentRows.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={paymentAnalyticsColumns}
          data={paymentRows}
        />
      )}
    </div>
  );

  const premiumAnalyticsLink = hostSlug
    ? `/host/${hostSlug}/host-premium?tab=advanced_video_analytics`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h5 className="text-xl font-medium">
            {isReports ? "Video analytics" : "Advanced video analytics"}
          </h5>
          <p className="text-muted-foreground text-sm">
            {isReports
              ? "Per-video view counts and payment insights for your content."
              : "Surface-level overview, payment breakdowns, and raw playback events."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void loadAll()}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {isReports ? (
        <>
          <Tabs
            value={reportsTab}
            onValueChange={val => {
              if (val === "payment_analytics") {
                setPaymentAnalyticsModalOpen(true);
                return;
              }
              setReportsTab(val as "video_views");
            }}
          >
            <TabsList className="flex h-14! w-full gap-1">
              <TabsTrigger
                value="video_views"
                className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
              >
                Video views
              </TabsTrigger>
              <TabsTrigger
                value="payment_analytics"
                className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
              >
                Payment analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="video_views">{videoViewsContent}</TabsContent>
          </Tabs>

          <Dialog
            open={paymentAnalyticsModalOpen}
            onOpenChange={setPaymentAnalyticsModalOpen}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Crown className="text-primary size-5" />
                  Payment analytics
                </DialogTitle>

                <DialogDescription asChild>
                  <div className="text-muted-foreground space-y-4">
                    <p>
                      Payment analytics shows detailed tip and payment activity
                      across your videos - including amounts, payment methods,
                      surfaces, and per-transaction history tied to playback.
                    </p>
                    <p>
                      Full payment analytics is available under{" "}
                      <strong>Advanced video analytics</strong> on Host Growth.
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2">
                {premiumAnalyticsLink ? (
                  <Button
                    type="button"
                    variant="default"
                    asChild
                    className="bg-black text-white hover:bg-black/80"
                  >
                    <Link
                      href={premiumAnalyticsLink}
                      onClick={() => setPaymentAnalyticsModalOpen(false)}
                    >
                      Go to Host Growth
                    </Link>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setPaymentAnalyticsModalOpen(false)}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <>
          <Tabs
            value={advancedTab}
            onValueChange={val =>
              setAdvancedTab(val as "overview" | "payment_analytics")
            }
          >
            <TabsList className="bg-secondary/20 flex h-14! w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="payment_analytics">
                Payment analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="overview"
              className="space-y-4"
            >
              {overviewContent}
            </TabsContent>

            <TabsContent value="payment_analytics">
              {paymentAnalyticsTable}
            </TabsContent>
          </Tabs>

          <Tabs
            value={surfaceTab}
            onValueChange={setSurfaceTab}
            className="space-y-4"
          >
            <TabsList className="bg-secondary/20 flex h-auto! w-full flex-wrap gap-1">
              {HOST_SURFACE_EVENT_TABS.map(tab => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="h-10! font-semibold"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {HOST_SURFACE_EVENT_TABS.map(tab => (
              <TabsContent
                key={tab.key}
                value={tab.key}
              >
                <div className="bg-card space-y-4 rounded-md p-6">
                  <div className="space-y-1">
                    <h5 className="text-xl font-medium">{tab.label} events</h5>
                    <p className="text-muted-foreground text-sm">
                      Raw playback and interaction events on this surface.
                    </p>
                  </div>
                  {loading && !surfaceEvents[tab.key]?.length ? (
                    <div className="flex min-h-[200px] items-center justify-center">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  ) : (
                    <DataTable
                      columns={videoEventColumns}
                      data={surfaceEvents[tab.key] ?? []}
                    />
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
}

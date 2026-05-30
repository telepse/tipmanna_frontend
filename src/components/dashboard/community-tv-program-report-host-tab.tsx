"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { ChevronDown, FileDown, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import type { RootState } from "@/redux/store";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type ListRow = {
  id: string;
  title: string;
  status: string;
  scheduledAt: string;
  itemCount: number;
  airSummary: string | null;
  applicationId: string | null;
};

type VideoRow = {
  enforcementItemId: string;
  position: number;
  channelTitle: string | null;
  channelId: string;
  windowStartUtc: string | null;
  windowEndUtcExclusive: string | null;
  aired: boolean;
  metrics: {
    messageCount: number;
    tipCount: number;
    tipAmountGbp: number;
    commentSubmit: number;
    purchasedCommentLineCount: number;
    commentLike: number;
    shareClick: number;
    save: number;
    videoComplete: number;
    totalInteractions: number;
    messages: { sender: string; text: string; createdAt: string }[];
  } | null;
};

function fmtRange(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  try {
    return `${new Date(start).toLocaleString()} → ${new Date(end).toLocaleString()}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function ProgramDetail({
  communityId,
  programId,
  applicationId,
  apiBase,
}: {
  communityId: string;
  programId: string;
  applicationId: string | null;
  apiBase: string;
}) {
  const authToken = useSelector((s: RootState) => s.auth.token);
  const [detail, setDetail] = useState<{
    title: string;
    videos: VideoRow[];
    applicationId: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const base = apiBase.replace(/\/$/, "");
  const prefix = `${base}/communities/${encodeURIComponent(communityId)}/tv/program-report`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = authToken;
      const q =
        applicationId != null && applicationId !== ""
          ? `?applicationId=${encodeURIComponent(applicationId)}`
          : "";
      const res = await fetch(`${prefix}/${programId}${q}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load detail");
      const data = await res.json();
      setDetail({
        title: data.title,
        videos: data.videos ?? [],
        applicationId: data.applicationId ?? null,
      });
    } catch {
      toast.error("Could not load program detail");
    } finally {
      setLoading(false);
    }
  }, [prefix, programId, applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = async (itemId: string, appId: string | null) => {
    const token = authToken;
    if (!token) {
      toast.error("Sign in required");
      return;
    }
    const q =
      appId != null && appId !== ""
        ? `?applicationId=${encodeURIComponent(appId)}`
        : "";
    try {
      const res = await fetch(
        `${prefix}/${programId}/item/${itemId}/export${q}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `community-program-report-${itemId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  if (loading) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading metrics…
      </p>
    );
  }
  if (!detail) return null;

  return (
    <div className="mt-2 overflow-x-auto rounded-md border text-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="p-2 text-left">#</th>
            <th className="p-2 text-left">Video</th>
            <th className="p-2 text-left">Air window</th>
            <th className="p-2 text-right">Tips</th>
            <th className="p-2 text-right">Interact</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {detail.videos.map(v => (
            <tr
              key={v.enforcementItemId}
              className="border-b"
            >
              <td className="p-2">{v.position + 1}</td>
              <td className="max-w-[180px] truncate p-2">
                {v.channelTitle ?? v.channelId}
              </td>
              <td className="p-2 text-xs">
                {v.aired
                  ? fmtRange(v.windowStartUtc, v.windowEndUtcExclusive)
                  : "Not aired"}
              </td>
              <td className="p-2 text-right">
                {v.metrics?.tipCount ?? 0} (£
                {v.metrics?.tipAmountGbp?.toFixed(2) ?? "0"})
              </td>
              <td className="p-2 text-right">
                {v.metrics?.totalInteractions ?? 0}
              </td>
              <td className="p-2">
                {v.aired ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void exportCsv(v.enforcementItemId, detail.applicationId)
                    }
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CommunityTvProgramReportHostTab({
  communityId,
  apiBase,
}: {
  communityId: string;
  apiBase: string;
}) {
  const authToken = useSelector((s: RootState) => s.auth.token);
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const base = apiBase.replace(/\/$/, "");
  const prefix = `${base}/communities/${encodeURIComponent(communityId)}/tv/program-report`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = authToken;
      const res = await fetch(`${prefix}?page=${page}&pageSize=25`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("list failed");
      const data = await res.json();
      setRows((data.rows ?? []) as ListRow[]);
    } catch {
      toast.error("Could not load program reports");
    } finally {
      setLoading(false);
    }
  }, [prefix, page]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 py-8">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading program reports…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Metrics for PROGRAM enforcements on your community TV
        (community_tv_looper surface).
      </p>
      {rows.length === 0 ? (
        <p className="text-sm">No program enforcements yet.</p>
      ) : (
        rows.map(row => (
          <Collapsible
            key={row.id}
            open={openId === row.id}
            onOpenChange={open => setOpenId(open ? row.id : null)}
          >
            <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border p-3 text-left">
              <span>
                <span className="font-medium">{row.title}</span>
                <span className="text-muted-foreground ml-2 text-sm">
                  {row.status} · {row.itemCount} videos
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 transition ${openId === row.id ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              {openId === row.id ? (
                <ProgramDetail
                  communityId={communityId}
                  programId={row.id}
                  applicationId={row.applicationId}
                  apiBase={apiBase}
                />
              ) : null}
            </CollapsibleContent>
          </Collapsible>
        ))
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, FileDown, Loader2, Mail } from "lucide-react";
import { toast } from "react-toastify";

import {
  emailCommunityTvProgramReportAction,
  exportCommunityTvProgramReportCombinedAction,
  exportCommunityTvProgramReportItemAction,
  getCommunityTvProgramReportDetailAction,
  listCommunityTvProgramReportsAction,
} from "@/actions/community-tv-host";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadBase64File } from "@/lib/download-base64";
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
    videoEncounter: number;
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

type ProgramTotals = {
  tipCount: number;
  tipAmountGbp: number;
  totalInteractions: number;
  messageCount: number;
  videoEncounter: number;
  purchasedCommentLineCount: number;
};

function ProgramDetail({
  communityId,
  programId,
  applicationId,
}: {
  communityId: string;
  programId: string;
  applicationId: string | null;
}) {
  const [detail, setDetail] = useState<{
    title: string;
    videos: VideoRow[];
    applicationId: string | null;
    programTotals: ProgramTotals | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailTo, setEmailTo] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCommunityTvProgramReportDetailAction(
        communityId,
        programId,
        applicationId
      );
      if (!res.success || !res.data) throw new Error("Failed to load detail");
      const data = res.data as {
        title: string;
        videos?: VideoRow[];
        applicationId?: string | null;
        programTotals?: ProgramTotals | null;
      };
      setDetail({
        title: data.title,
        videos: data.videos ?? [],
        applicationId: data.applicationId ?? null,
        programTotals: data.programTotals ?? null,
      });
    } catch {
      toast.error("Could not load program detail");
    } finally {
      setLoading(false);
    }
  }, [communityId, programId, applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = async (itemId: string, appId: string | null) => {
    try {
      const res = await exportCommunityTvProgramReportItemAction(
        communityId,
        programId,
        itemId,
        appId
      );
      if (!res.success || !res.data) throw new Error("Export failed");
      downloadBase64File(
        res.data.base64,
        `community-program-report-${itemId.slice(0, 8)}.csv`,
        res.data.contentType
      );
      toast.success("Downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const exportCombined = async () => {
    const appId = detail?.applicationId ?? applicationId;
    try {
      const res = await exportCommunityTvProgramReportCombinedAction(
        communityId,
        programId,
        appId
      );
      if (!res.success || !res.data) throw new Error("Export failed");
      downloadBase64File(
        res.data.base64,
        "community-program-combined.csv",
        res.data.contentType
      );
      toast.success("Combined report downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const emailReport = async () => {
    if (!emailTo.trim()) {
      toast.error("Enter recipient email");
      return;
    }
    const appId = detail?.applicationId ?? applicationId;
    setEmailSending(true);
    try {
      const res = await emailCommunityTvProgramReportAction(
        communityId,
        programId,
        emailTo.trim(),
        appId
      );
      if (!res.success)
        throw new Error(res.message ?? res.error ?? "Email failed");
      toast.success("Report emailed");
      setEmailOpen(false);
      setEmailTo("");
    } catch {
      toast.error("Email failed");
    } finally {
      setEmailSending(false);
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

  const totals = detail.programTotals;

  return (
    <div className="mt-2 space-y-2">
      {totals ? (
        <p className="text-muted-foreground text-xs">
          Program totals: {totals.tipCount} tips (£
          {totals.tipAmountGbp.toFixed(2)}), {totals.messageCount} msgs,{" "}
          {totals.videoEncounter} encounters, {totals.totalInteractions}{" "}
          interactions
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void exportCombined()}
        >
          <FileDown className="mr-1 h-4 w-4" />
          Export program CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEmailOpen(v => !v)}
        >
          <Mail className="mr-1 h-4 w-4" />
          Email report
        </Button>
        {emailOpen ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="email"
              className="h-8 w-52"
              placeholder="recipient@email.com"
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
            />
            <Button
              size="sm"
              disabled={emailSending}
              onClick={() => void emailReport()}
            >
              Send
            </Button>
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-md border text-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Video</th>
              <th className="p-2 text-left">Air window</th>
              <th className="p-2 text-right">Tips</th>
              <th className="p-2 text-right">Encounter</th>
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
                  {v.metrics?.videoEncounter ?? 0}
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
                        void exportCsv(
                          v.enforcementItemId,
                          detail.applicationId
                        )
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
    </div>
  );
}

export function CommunityTvProgramReportHostTab({
  communityId,
}: {
  communityId: string;
  apiBase?: string;
}) {
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCommunityTvProgramReportsAction(
        communityId,
        page,
        25
      );
      if (!res.success || !res.data) throw new Error("list failed");
      setRows((res.data.rows ?? []) as ListRow[]);
    } catch {
      toast.error("Could not load program reports");
    } finally {
      setLoading(false);
    }
  }, [communityId, page]);

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
        Metrics for PROGRAM enforcements on your community TV (
        <code>community_tv_looper</code> surface only — pre/post notice slates
        excluded).
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

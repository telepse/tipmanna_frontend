"use server";

import {
  actionFail,
  actionOk,
  runServerFetch,
  type ActionResult,
} from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

function backendUrl(path: string): string {
  const b = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return `${b.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function communityPrefix(communityId: string): string {
  return `/communities/${encodeURIComponent(communityId.trim())}/tv`;
}

async function runHostBlobFetch(
  path: string,
  init: RequestInit,
  label: string
): Promise<ActionResult<{ base64: string; contentType: string }>> {
  try {
    const headers = {
      ...(await serverHostAuthHeaders()),
      ...(init.headers ?? {}),
    };
    const res = await fetch(backendUrl(path), {
      ...init,
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const text = await res.text();
        if (text) detail = text.slice(0, 512);
      } catch {
        /* ignore */
      }
      return actionFail(detail, label);
    }
    const buf = await res.arrayBuffer();
    return actionOk({
      base64: Buffer.from(buf).toString("base64"),
      contentType:
        res.headers.get("content-type") ?? "application/octet-stream",
    });
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Download failed",
      label
    );
  }
}

export async function listCommunityTvContentBlocksAction(communityId: string) {
  return runServerFetch<{ items: unknown[] }>(
    backendUrl(`${communityPrefix(communityId)}/content-blocks`),
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "listCommunityTvContentBlocksAction"
  );
}

export async function listCommunityTvGlobalBansAction(communityId: string) {
  return runServerFetch<{ items: unknown[] }>(
    backendUrl(`${communityPrefix(communityId)}/global-bans`),
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "listCommunityTvGlobalBansAction"
  );
}

export async function searchCommunityTvChannelsAction(
  communityId: string,
  q: string
) {
  const qs = new URLSearchParams({ q: q.trim() });
  return runServerFetch<{ items: unknown[] }>(
    `${backendUrl(`${communityPrefix(communityId)}/channels/search`)}?${qs}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "searchCommunityTvChannelsAction"
  );
}

export async function reorderCommunityTvScheduleAction(
  communityId: string,
  scheduleId: string,
  body: { orderedItemIds: string[]; expectedRevision: number }
) {
  return runServerFetch(
    backendUrl(
      `${communityPrefix(communityId)}/daily-schedule/${encodeURIComponent(scheduleId)}/reorder`
    ),
    {
      method: "PATCH",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "reorderCommunityTvScheduleAction"
  );
}

export async function deactivateCommunityTvAction(communityId: string) {
  return runServerFetch(
    backendUrl(`${communityPrefix(communityId)}/deactivate`),
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "deactivateCommunityTvAction"
  );
}

export async function removeCommunityTvContentBlockAction(
  communityId: string,
  channelId: string
) {
  return runServerFetch(
    backendUrl(
      `${communityPrefix(communityId)}/content-blocks/${encodeURIComponent(channelId)}`
    ),
    {
      method: "DELETE",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "removeCommunityTvContentBlockAction"
  );
}

export async function excludeCommunityTvChannelAction(
  communityId: string,
  body: { eventChannelId: string; reason?: string }
) {
  return runServerFetch(
    backendUrl(`${communityPrefix(communityId)}/content-blocks/exclude`),
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "excludeCommunityTvChannelAction"
  );
}

export async function getCommunityTvAdjustmentConfigAction(
  communityId: string
) {
  return runServerFetch(
    backendUrl(`${communityPrefix(communityId)}/adjustment-config`),
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getCommunityTvAdjustmentConfigAction"
  );
}

export async function putCommunityTvAdjustmentConfigAction(
  communityId: string,
  body: unknown
) {
  return runServerFetch(
    backendUrl(`${communityPrefix(communityId)}/adjustment-config`),
    {
      method: "PUT",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "putCommunityTvAdjustmentConfigAction"
  );
}

export async function resetCommunityTvAdjustmentConfigAction(
  communityId: string
) {
  return runServerFetch(
    backendUrl(`${communityPrefix(communityId)}/adjustment-config/reset`),
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "resetCommunityTvAdjustmentConfigAction"
  );
}

export async function toggleCommunityTvAdjustmentEnabledAction(
  communityId: string,
  enabled: boolean
) {
  return runServerFetch(
    backendUrl(`${communityPrefix(communityId)}/adjustment-config/enabled`),
    {
      method: "PATCH",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({ enabled }),
      cache: "no-store",
    },
    "toggleCommunityTvAdjustmentEnabledAction"
  );
}

export async function getCommunityTvEnforcementHistoryAction(
  communityId: string
) {
  return runServerFetch<{ items: unknown[] }>(
    backendUrl(`${communityPrefix(communityId)}/enforcement/history`),
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getCommunityTvEnforcementHistoryAction"
  );
}

export async function getCommunityTvEnforcementAutoApproveStatusAction(
  communityId: string
) {
  return runServerFetch<{ autoApprove: boolean }>(
    backendUrl(
      `${communityPrefix(communityId)}/enforcement/auto-approve-status`
    ),
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getCommunityTvEnforcementAutoApproveStatusAction"
  );
}

export async function postCommunityTvEnforcementDraftAction(
  communityId: string,
  body: {
    kind: "VIDEO" | "PROGRAM";
    title: string;
    scheduledAt: string;
    channelIds: string[];
  }
) {
  return runServerFetch(
    backendUrl(`${communityPrefix(communityId)}/enforcement/draft`),
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "postCommunityTvEnforcementDraftAction"
  );
}

export async function postCommunityTvEnforcementLifecycleAction(
  communityId: string,
  enforcementId: string,
  action: "submit" | "withdraw" | "revocation-request" | "cancel-revocation"
) {
  return runServerFetch(
    backendUrl(
      `${communityPrefix(communityId)}/enforcement/${encodeURIComponent(enforcementId)}/${action}`
    ),
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    `postCommunityTvEnforcementLifecycleAction:${action}`
  );
}

export async function listCommunityTvProgramReportsAction(
  communityId: string,
  page = 1,
  pageSize = 25
) {
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return runServerFetch<{ rows: unknown[] }>(
    `${backendUrl(`${communityPrefix(communityId)}/program-report`)}?${qs}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "listCommunityTvProgramReportsAction"
  );
}

export async function getCommunityTvProgramReportDetailAction(
  communityId: string,
  programId: string,
  applicationId?: string | null
) {
  const qs =
    applicationId != null && applicationId !== ""
      ? `?applicationId=${encodeURIComponent(applicationId)}`
      : "";
  return runServerFetch(
    backendUrl(
      `${communityPrefix(communityId)}/program-report/${encodeURIComponent(programId)}${qs}`
    ),
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getCommunityTvProgramReportDetailAction"
  );
}

export async function exportCommunityTvProgramReportItemAction(
  communityId: string,
  programId: string,
  itemId: string,
  applicationId?: string | null
) {
  const qs =
    applicationId != null && applicationId !== ""
      ? `?applicationId=${encodeURIComponent(applicationId)}`
      : "";
  return runHostBlobFetch(
    `${communityPrefix(communityId)}/program-report/${encodeURIComponent(programId)}/item/${encodeURIComponent(itemId)}/export${qs}`,
    { method: "GET" },
    "exportCommunityTvProgramReportItemAction"
  );
}

export async function exportCommunityTvProgramReportCombinedAction(
  communityId: string,
  programId: string,
  applicationId?: string | null
) {
  const qs =
    applicationId != null && applicationId !== ""
      ? `?applicationId=${encodeURIComponent(applicationId)}`
      : "";
  return runHostBlobFetch(
    `${communityPrefix(communityId)}/program-report/${encodeURIComponent(programId)}/export${qs}`,
    { method: "GET" },
    "exportCommunityTvProgramReportCombinedAction"
  );
}

export async function emailCommunityTvProgramReportAction(
  communityId: string,
  programId: string,
  to: string,
  applicationId?: string | null
) {
  const qs =
    applicationId != null && applicationId !== ""
      ? `?applicationId=${encodeURIComponent(applicationId)}`
      : "";
  return runServerFetch(
    backendUrl(
      `${communityPrefix(communityId)}/program-report/${encodeURIComponent(programId)}/email${qs}`
    ),
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({ to: to.trim() }),
      cache: "no-store",
    },
    "emailCommunityTvProgramReportAction"
  );
}

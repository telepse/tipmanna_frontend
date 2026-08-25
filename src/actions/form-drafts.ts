"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

export type FormDraftKind =
  | "content_only"
  | "event_only"
  | "event_and_content"
  | "community_video"
  | "room_add_video";

export type FormDraftSummary = {
  id: string;
  kind: FormDraftKind;
  title: string | null;
  step: number;
  updatedAt: string;
  expiresAt: string;
};

export type FormDraftRow = FormDraftSummary & {
  payloadJson: unknown;
  policyJson?: unknown;
};

export async function listFormDraftsAction(kind?: FormDraftKind) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  const q = kind ? `?kind=${encodeURIComponent(kind)}` : "";
  return runServerFetch<FormDraftSummary[]>(
    `${base.replace(/\/$/, "")}/form-drafts${q}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "listFormDraftsAction"
  );
}

export async function getFormDraftAction(id: string) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return runServerFetch<FormDraftRow>(
    `${base.replace(/\/$/, "")}/form-drafts/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getFormDraftAction"
  );
}

export async function upsertFormDraftAction(body: {
  id?: string;
  kind: FormDraftKind;
  title?: string;
  step?: number;
  payloadJson?: unknown;
  policyJson?: unknown;
}) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  const path = body.id
    ? `/form-drafts/${encodeURIComponent(body.id)}`
    : "/form-drafts";
  return runServerFetch<FormDraftRow>(
    `${base.replace(/\/$/, "")}${path}`,
    {
      method: body.id ? "PUT" : "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(body),
    },
    "upsertFormDraftAction"
  );
}

export async function deleteFormDraftAction(id: string) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return runServerFetch(
    `${base.replace(/\/$/, "")}/form-drafts/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: await serverHostAuthHeaders(),
    },
    "deleteFormDraftAction"
  );
}

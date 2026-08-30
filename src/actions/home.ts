"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { unwrapPaginatedList } from "@/lib/unwrap-paginated-list";
import type { Cause } from "@/types/cause.types";

const listFetchOpts = {
  method: "GET" as const,
  headers: { "Content-Type": "application/json" },
  cache: "no-store" as const,
};

// -------- Get all causes -------- //
export async function getAllCausesAction() {
  return runServerFetch<Cause[]>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/causes?limit=100`,
    listFetchOpts,
    "getAllCausesAction",
    unwrapPaginatedList
  );
}

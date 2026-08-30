"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { unwrapPaginatedList } from "@/lib/unwrap-paginated-list";

export async function getCharactersForTipping() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/characters/for-tipping?limit=100`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getCharactersForTipping",
    unwrapPaginatedList
  );
}

export async function getAllCharacterSets() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/characters/sets?limit=100`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getAllCharacterSets",
    unwrapPaginatedList
  );
}

"use server";

import { runServerFetch } from "@/lib/action-fetch";

export async function getCharactersForTipping() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/characters/for-tipping`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getCharactersForTipping"
  );
}

export async function getAllCharacterSets() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/characters/sets`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getAllCharacterSets"
  );
}

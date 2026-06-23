"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { unwrapPaginatedList } from "@/lib/unwrap-paginated-list";
import type { Cause } from "@/types/cause.types";
import type { Event } from "@/types/event.types";
import type { Testimonial } from "@/types/testimonial.types";

// -------- Get impact in numbers -------- //
export async function getImpactInNumbersAction() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/impact-in-numbers`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getImpactInNumbersAction"
  );
}

const listFetchOpts = {
  method: "GET" as const,
  headers: { "Content-Type": "application/json" },
  cache: "no-store" as const,
};

// -------- Get all featured events -------- //
export async function getAllFeaturedEventsAction() {
  return runServerFetch<Event[]>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/featured?limit=100`,
    listFetchOpts,
    "getAllFeaturedEventsAction",
    unwrapPaginatedList
  );
}

// -------- Get all causes -------- //
export async function getAllCausesAction() {
  return runServerFetch<Cause[]>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/causes?limit=100`,
    listFetchOpts,
    "getAllCausesAction",
    unwrapPaginatedList
  );
}

// -------- Get all testimonials -------- //
export async function getAllTestimonialsAction() {
  return runServerFetch<Testimonial[]>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/testimonials?limit=100`,
    listFetchOpts,
    "getAllTestimonialsAction",
    unwrapPaginatedList
  );
}

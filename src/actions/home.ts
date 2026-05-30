"use server";

import { runServerFetch } from "@/lib/action-fetch";

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

// -------- Get all featured events -------- //
export async function getAllFeaturedEventsAction() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/featured`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getAllFeaturedEventsAction"
  );
}

// -------- Get all causes -------- //
export async function getAllCausesAction() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/causes`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getAllCausesAction"
  );
}

// -------- Get all testimonials -------- //
export async function getAllTestimonialsAction() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/testimonials`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getAllTestimonialsAction"
  );
}

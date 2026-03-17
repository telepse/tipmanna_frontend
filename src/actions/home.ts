"use server";

// -------- Get impact in numbers -------- //
export async function getImpactInNumbersAction() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/impact-in-numbers`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to fetch impact in numbers",
    };
  }

  return { success: true, data };
}

// -------- Get all featured events -------- //
export async function getAllFeaturedEventsAction() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/featured`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to fetch featured events",
    };
  }

  return { success: true, data };
}

// -------- Get all causes -------- //
export async function getAllCausesAction() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/causes`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to fetch all causes",
    };
  }

  return { success: true, data };
}

// -------- Get all testimonials -------- //
export async function getAllTestimonialsAction() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/testimonials`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to fetch all testimonials",
    };
  }

  return { success: true, data };
}

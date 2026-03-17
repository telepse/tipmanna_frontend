"use server";

// -------- Get top tippers -------- /
export async function getTopTippersAction(hostId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/top-tippers`,
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
      message: data?.error?.message || "Failed to fetch top tippers",
    };
  }

  return { success: true, data };
}

// -------- Get top tipper details -------- /
export async function getTopTipperDetailsAction(
  hostId: string,
  tipperId: string
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/top-tippers/${tipperId}`,
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
      message: data?.error?.message || "Failed to fetch top tipper details",
    };
  }

  return { success: true, data };
}

// -------- Get host event summaries -------- /
export async function getHostEventSummaries(hostId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events`,
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
      message: data?.error?.message || "Failed to fetch host event summaries",
    };
  }

  return { success: true, data };
}

// -------- Get host transactions -------- /
export async function getHostTransactionsAction(hostId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/transactions`,
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
      message: data?.error?.message || "Failed to fetch host transactions",
    };
  }

  return { success: true, data };
}

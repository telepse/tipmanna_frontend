"use server";

// -------- Get latest contents -------- //
export async function getLatestContents() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/latest`,
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
      message: data?.error?.message || "Failed to fetch latest contents",
    };
  }

  return { success: true, data };
}

// -------- Get most tipped contents -------- //
export async function getMostTippedContents() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/most-tipped`,
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
      message: data?.error?.message || "Failed to fetch latest contents",
    };
  }

  return { success: true, data };
}

// -------- Get tip feed -------- //
export async function getTipFeed() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/tip-feed`,
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
      message: data?.error?.message || "Failed to fetch tip feed",
    };
  }

  return { success: true, data };
}

// -------- Save video -------- //
export async function saveVideo(channelId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/channels/${channelId}/save`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to fetch tip feed",
    };
  }

  return { success: true, data };
}

// -------- Get all featured contents -------- //
export async function getAllFeaturedContentsAction() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/featured`,
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
      message: data?.error?.message || "Failed to fetch featured contents",
    };
  }

  return { success: true, data };
}

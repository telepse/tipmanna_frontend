"use server";

export async function getCharactersForTipping() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/characters/for-tipping`,
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
      message: data?.error?.message || "Failed to fetch characters for tipping",
    };
  }

  return { success: true, data };
}

export async function getAllCharacterSets() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/characters/sets`,
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
      message: data?.error?.message || "Failed to fetch character sets",
    };
  }

  return { success: true, data };
}

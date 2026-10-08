"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { getToken } from "@/lib/getToken";
import { getHostToken } from "@/lib/getHostToken";

export type CloudinarySignPayload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

export async function getCloudinarySignAction() {
  const tipper = (await getToken())?.trim();
  const host = (await getHostToken())?.trim();
  const bearer = tipper || host;
  if (!bearer) {
    return {
      success: false as const,
      message: "Sign in to upload images",
      data: null as CloudinarySignPayload | null,
    };
  }

  return runServerFetch<CloudinarySignPayload>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/uploads/cloudinary-sign`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    },
    "getCloudinarySignAction",
    raw => {
      const body = raw as { data?: CloudinarySignPayload };
      if (!body?.data) {
        throw new Error("Invalid cloudinary sign response");
      }
      return body.data;
    }
  );
}

"use client";

import axios from "axios";

import { getCloudinarySignAction } from "@/actions/uploads";
import { compressImageForUpload } from "@/lib/compress-image-for-upload";

export const uploadImage = async (icon: string) => {
  const signRes = await getCloudinarySignAction();
  if (!signRes.success || !signRes.data) {
    throw new Error(signRes.message ?? "Could not authorize upload");
  }

  const { cloudName, apiKey, timestamp, signature, folder } = signRes.data;

  try {
    const compressed = await compressImageForUpload(icon);
    const formData = new FormData();
    formData.append("file", compressed);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);
    formData.append("folder", folder);

    const { data } = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      formData
    );
    return data;
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to upload image");
  }
};

export async function tryUploadImage(
  icon: string
): Promise<
  | { ok: true; data: Awaited<ReturnType<typeof uploadImage>> }
  | { ok: false; message: string }
> {
  try {
    const data = await uploadImage(icon);
    return { ok: true, data };
  } catch (err: unknown) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Failed to upload image",
    };
  }
}

"use client";

import axios from "axios";

import { compressImageForUpload } from "@/lib/compress-image-for-upload";

const cloud_name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const cloud_secret = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export const uploadImage = async (icon: string) => {
  try {
    const compressed = await compressImageForUpload(icon);
    const formData = new FormData();
    formData.append("upload_preset", cloud_secret);
    formData.append("file", compressed);

    const { data } = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
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

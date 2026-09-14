"use client";

import imageCompression from "browser-image-compression";

const COMPRESS_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

function dataUrlToFile(dataUrl: string, fileName = "upload.webp"): File {
  const [header, base64] = dataUrl.split(",");
  if (!base64) {
    throw new Error("Invalid image data");
  }
  const mimeMatch = header.match(/data:(.*?);/);
  const mime = mimeMatch?.[1] ?? "image/webp";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mime });
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read compressed image"));
    reader.readAsDataURL(file);
  });
}

/** Compress to WebP (max edge 1920) before Cloudinary upload. */
export async function compressImageForUpload(
  input: string | File | Blob
): Promise<string> {
  if (typeof input === "string") {
    if (!input.startsWith("data:")) {
      return input;
    }
    const file = dataUrlToFile(input);
    const compressed = await imageCompression(file, COMPRESS_OPTIONS);
    return fileToDataUrl(compressed);
  }

  const file =
    input instanceof File
      ? input
      : new File([input], "upload.webp", {
          type: input.type || "image/webp",
        });
  const compressed = await imageCompression(file, COMPRESS_OPTIONS);
  return fileToDataUrl(compressed);
}

"use server";

import axios from "axios";

const cloud_name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const cloud_secret = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export const uploadImage = async (icon: string) => {
  const formData = new FormData();
  formData.append("upload_preset", cloud_secret);
  formData.append("file", icon);

  try {
    const { data } = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
      formData
    );
    return data;
  } catch (err: unknown) {
    if (err instanceof Error) {
      //   toast.error(err.message);
    } else {
      //   toast.error("Failed to upload image");
    }
  }
};

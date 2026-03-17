import { useState, useRef } from "react";

export const useImageUpload = ({
  maxSizeMB = 1,
  allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jiff"],
} = {}) => {
  const [image, setImage] = useState<File | null>(null);
  const [readableImage, setReadableImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const img = e.target.files?.[0];
    if (!img) return;

    if (!allowedTypes.includes(img.type)) {
      setError(`${img.name} format is not supported`);
      return;
    }

    if (img.size > maxSizeMB * 1024 * 1024) {
      setError(`${img.name} is too large, maximum ${maxSizeMB} MB allowed`);
      return;
    }

    setError("");
    setImage(img);

    const reader = new FileReader();
    reader.onload = event => {
      setReadableImage(event.target?.result as string);
    };
    reader.readAsDataURL(img);
  };

  const handleChangeImage = () => {
    inputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setImage(null);
    setReadableImage(null);
    setError("");
  };

  return {
    image,
    readableImage,
    error,
    inputRef,
    handleImageUpload,
    handleChangeImage,
    handleRemoveImage,
    setReadableImage,
  };
};

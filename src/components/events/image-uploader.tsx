import { useEffect } from "react";
import Image from "next/image";

// Third-party imports
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";

// Local imports
import { useImageUpload } from "@/hooks/use-image-upload";
import { CustomErrorMessage } from "@/components/shared/custom-error-message";

interface Props {
  onImageUpload: (image: string) => void;
  defaultImage?: string;
}

export const ImageUploader = ({ onImageUpload, defaultImage }: Props) => {
  const {
    readableImage,
    error,
    inputRef,
    handleImageUpload,
    handleChangeImage,
    handleRemoveImage,
    setReadableImage,
  } = useImageUpload();

  useEffect(() => {
    if (defaultImage) {
      setReadableImage(defaultImage); // show the existing image initially
    }
  }, [defaultImage, setReadableImage]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleImageUpload(e);

    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      if (result) {
        onImageUpload(result); // ✅ Call once, directly
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    handleRemoveImage();
    onImageUpload(""); // Clear the form field
  };

  return (
    <>
      {readableImage ? (
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative flex cursor-pointer items-center gap-4"
            onClick={handleChangeImage}
          >
            <Image
              src={readableImage}
              alt="Readable image"
              loading="lazy"
              className="h-[320px] w-[640px] cursor-pointer rounded-md object-cover p-1"
              width={640}
              height={320}
            />

            <div className="absolute top-4 right-4">
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="moonstone"
                  size="sm"
                  onClick={handleChangeImage}
                >
                  Change
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove} // Use the updated handler
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex cursor-pointer flex-wrap items-center gap-4 rounded-md border border-dashed p-20"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.click();
            }
          }}
        >
          <Button
            type="button"
            className="rounded-lg bg-white text-black hover:bg-white"
          >
            <CloudUpload className="size-10" />
          </Button>

          <div className="space-y-1">
            <h5 className="font-medium">Choose or drag and drop image</h5>
            <p className="text-sm">Maximum size 1 MB</p>
          </div>
        </div>
      )}

      <input
        type="file"
        name="picture"
        ref={inputRef}
        hidden
        accept="image/png,image/jpeg,image/webp,image/jiff"
        onChange={handleUpload} // Use the updated handler
      />

      {error && <CustomErrorMessage message={error} />}
    </>
  );
};

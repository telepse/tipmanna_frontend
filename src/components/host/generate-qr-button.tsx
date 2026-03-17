import { useRef } from "react";

// Third-party imports
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import QRCode from "react-qr-code";

export const GenerateQrButton = ({ link }: { link: string }) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    // Convert SVG to PNG
    const serializer = new XMLSerializer();
    const svgData = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const img = new Image();
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "event-qr.png";
      a.click();
    };

    img.src = url;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <QrCode className="size-5" /> Generate QR code
        </Button>
      </DialogTrigger>

      <DialogContent className="flex flex-col items-center space-y-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="open_sans">
            Your host event QR code
          </DialogTitle>

          <div
            ref={qrRef}
            className="rounded-xl bg-white p-4"
          >
            <QRCode
              size={200}
              bgColor="white"
              fgColor="black"
              value={link}
            />
          </div>

          <Button
            size="lg"
            onClick={handleDownload}
            className="w-full"
          >
            Save QR
          </Button>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

import { LoaderCircle } from "lucide-react";

export const Loading = () => {
  return (
    <div className="flex h-screen items-center justify-center">
      <LoaderCircle className="text-primary size-14 animate-spin" />
    </div>
  );
};

import Link from "next/link";

// Third-party imports
import { Button } from "@/components/ui/button";

export const TVFooter = () => {
  return (
    <div className="bg-primary fixed bottom-0 z-50 flex w-full flex-col items-center justify-center px-4 py-2">
      <div className="flex max-w-xl items-center gap-4">
        <div>
          <h5 className="font-semibold">
            Join the Tipmanna creator&apos;s community!
          </h5>
          <p className="text-xs leading-normal text-gray-800">
            Sign in to get full access: watch all videos, create videos, build
            collections, and share your thoughts with other users.
          </p>
        </div>

        <Link
          href="/sign-in"
          className="text-sm"
        >
          <Button className="bg-black hover:bg-black/80">Sign in</Button>
        </Link>
      </div>
    </div>
  );
};
